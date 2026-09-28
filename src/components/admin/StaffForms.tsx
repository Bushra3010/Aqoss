'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Alert, Field } from '@/components/ui';
import {
  changeMyPasswordAction,
  deleteRoleAction,
  removeStaffAction,
  saveRoleAction,
  saveStaffAction,
  setStaffPasswordAction,
  updateMyProfileAction,
  type StaffFormState,
} from '@/app/admin/staff-actions';
import { cn } from '@/lib/utils';

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

export interface StaffValues {
  id: string;
  full_name: string | null;
  email: string;
  mobile: string | null;
  role_id: string;
  hotel_scope: string[];
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

/**
 * Add a staff member, or edit one. `roles` are only those the signed-in admin
 * may grant; `allowAllHotels` is false for an admin limited to some hotels.
 * `self` locks role, hotels and access — nobody changes their own.
 */
export function StaffForm({
  staff,
  roles,
  hotels,
  allowAllHotels,
  self = false,
}: {
  staff?: StaffValues;
  roles: RoleOption[];
  hotels: { id: string; name: string; city: string | null }[];
  allowAllHotels: boolean;
  self?: boolean;
}) {
  const [state, action] = useFormState<StaffFormState, FormData>(saveStaffAction, {});
  const err = (name: string) => state.fieldErrors?.[name];
  const [roleId, setRoleId] = useState(staff?.role_id ?? '');
  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <form action={action} className="space-y-6" noValidate>
      {staff ? <input type="hidden" name="admin_user_id" value={staff.id} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}

      <Section title="Person">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name" htmlFor="full_name" error={err('full_name')}>
            <input id="full_name" name="full_name" className="input" defaultValue={staff?.full_name ?? ''} autoComplete="off" />
          </Field>
          <Field label="Email (sign-in)" htmlFor="email" error={err('email')}>
            <input id="email" name="email" type="email" className="input" defaultValue={staff?.email ?? ''} autoComplete="off" />
          </Field>
          <Field label="Phone" htmlFor="mobile" error={err('mobile')} hint="Optional">
            <input id="mobile" name="mobile" type="tel" className="input" defaultValue={staff?.mobile ?? ''} autoComplete="off" />
          </Field>
        </div>
      </Section>

      <Section title="Access" hint={self ? 'You cannot change your own role, hotels or access. Ask another admin.' : undefined}>
        <fieldset disabled={self} className="space-y-5">
          <Field label="Role" htmlFor="role_id" error={err('role_id')} hint={selectedRole?.description ?? undefined}>
            <select id="role_id" name="role_id" className="input max-w-md" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="" disabled>Choose a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </Field>

          <HotelScopePicker hotels={hotels} initial={staff?.hotel_scope ?? []} allowAll={allowAllHotels} error={err('hotel_scope')} />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" defaultChecked={staff?.is_active ?? true} className="h-4 w-4 rounded border-slate-300" />
            Active — can sign in
          </label>
        </fieldset>
        {/* A disabled fieldset submits nothing; keep your own values as they are. */}
        {self && staff ? (
          <>
            <input type="hidden" name="role_id" value={staff.role_id} />
            {staff.hotel_scope.length ? (
              staff.hotel_scope.map((id) => <input key={id} type="hidden" name="hotel_ids" value={id} />)
            ) : (
              <input type="hidden" name="scope" value="all" />
            )}
            {staff.is_active ? <input type="hidden" name="is_active" value="on" /> : null}
          </>
        ) : null}
      </Section>

      {staff ? null : (
        <Section title="Password" hint="They sign in with their email and this password, and can change it under My account.">
          <PasswordFields name="password" err={err} />
        </Section>
      )}

      <div className="flex items-center gap-3">
        <Submit label={staff ? 'Save changes' : 'Add staff member'} />
        <Link href="/admin/admins" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}

function HotelScopePicker({
  hotels,
  initial,
  allowAll,
  error,
}: {
  hotels: { id: string; name: string; city: string | null }[];
  initial: string[];
  allowAll: boolean;
  error?: string;
}) {
  const [mode, setMode] = useState<'all' | 'some'>(allowAll && initial.length === 0 ? 'all' : 'some');
  const [chosen, setChosen] = useState<Set<string>>(new Set(initial));
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? hotels.filter((h) => `${h.name} ${h.city ?? ''}`.toLowerCase().includes(term)) : hotels;
  }, [hotels, q]);

  return (
    <fieldset>
      <legend className="label">Hotels</legend>
      {mode === 'all' ? <input type="hidden" name="scope" value="all" /> : null}
      <div className="flex flex-wrap gap-2">
        {allowAll ? <Choice checked={mode === 'all'} onChange={() => setMode('all')} label="Every hotel" /> : null}
        <Choice checked={mode === 'some'} onChange={() => setMode('some')} label="Selected hotels" />
      </div>

      {mode === 'some' ? (
        <div className="mt-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 p-2">
            <input
              type="search"
              className="input py-1.5"
              placeholder="Search hotels"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search hotels"
            />
            <span className="shrink-0 text-xs text-slate-500">{chosen.size} chosen</span>
          </div>
          <div className="grid max-h-60 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
            {/* Chosen hotels hidden by the search still have to be submitted. */}
            {[...chosen].filter((id) => !shown.some((h) => h.id === id)).map((id) => (
              <input key={id} type="hidden" name="hotel_ids" value={id} />
            ))}
            {shown.map((h) => (
              <label key={h.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  name="hotel_ids"
                  value={h.id}
                  checked={chosen.has(h.id)}
                  onChange={(e) =>
                    setChosen((c) => {
                      const next = new Set(c);
                      if (e.target.checked) next.add(h.id);
                      else next.delete(h.id);
                      return next;
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="truncate">{h.name}</span>
                {h.city ? <span className="ml-auto shrink-0 text-xs text-slate-400">{h.city}</span> : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </fieldset>
  );
}

/** Set a new password for someone else. */
export function SetPasswordForm({ adminUserId }: { adminUserId: string }) {
  const [state, action] = useFormState<StaffFormState, FormData>(setStaffPasswordAction, {});
  const err = (name: string) => state.fieldErrors?.[name];
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="admin_user_id" value={adminUserId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <PasswordFields name="password" err={err} key={state.success} />
      <Submit label="Set new password" />
    </form>
  );
}

export function RemoveStaffButton({ adminUserId, name }: { adminUserId: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      <button
        type="button"
        className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Remove ${name}'s access? They will no longer be able to sign in. Their past work stays in the records.`)) return;
          start(async () => {
            setError(null);
            const result = await removeStaffAction(adminUserId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? 'Removing…' : 'Remove access'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export interface PermissionOption {
  key: string;
  module: string;
  action: string;
  description: string | null;
}

export function RoleForm({
  role,
  permissions,
}: {
  role?: { id: string; name: string; description: string | null; permissions: string[] };
  permissions: PermissionOption[];
}) {
  const [state, action] = useFormState<StaffFormState, FormData>(saveRoleAction, {});
  const err = (name: string) => state.fieldErrors?.[name];
  const [chosen, setChosen] = useState<Set<string>>(new Set(role?.permissions ?? []));

  const modules = useMemo(() => {
    const byModule = new Map<string, PermissionOption[]>();
    for (const p of permissions) byModule.set(p.module, [...(byModule.get(p.module) ?? []), p]);
    return [...byModule.entries()];
  }, [permissions]);

  const toggle = (keys: string[], on: boolean) =>
    setChosen((c) => {
      const next = new Set(c);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  return (
    <form action={action} className="space-y-6" noValidate>
      {role ? <input type="hidden" name="role_id" value={role.id} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}

      <Section title="Role">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="role-name" error={err('name')}>
            <input id="role-name" name="name" className="input" defaultValue={role?.name ?? ''} placeholder="Front Desk" />
          </Field>
          <Field label="Description" htmlFor="role-description" hint="Optional — shown when choosing a role">
            <input id="role-description" name="description" className="input" defaultValue={role?.description ?? ''} placeholder="Check-in, check-out and payments at the desk" />
          </Field>
        </div>
      </Section>

      <Section title="Permissions" hint={`${chosen.size} selected. "read" lets them see a section; the others let them change things.`}>
        {err('permissions') ? <p className="mb-3 text-xs text-rose-600">{err('permissions')}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(([module, perms]) => {
            const keys = perms.map((p) => p.key);
            const all = keys.every((k) => chosen.has(k));
            return (
              <fieldset key={module} className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-sm font-semibold capitalize text-slate-900">{module}</legend>
                <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <input type="checkbox" checked={all} onChange={(e) => toggle(keys, e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300" />
                  All {module}
                </label>
                {perms.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 py-0.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p.key}
                      checked={chosen.has(p.key)}
                      onChange={(e) => toggle([p.key], e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      {p.action}
                      {p.description ? <span className="block text-xs text-slate-400">{p.description}</span> : null}
                    </span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Submit label={role ? 'Save role' : 'Create role'} />
        <Link href="/admin/admins/roles" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}

export function DeleteRoleButton({ roleId, name }: { roleId: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className="text-sm font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete the ${name} role? This cannot be undone.`)) return;
          start(async () => {
            setError(null);
            const result = await deleteRoleAction(roleId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? 'Deleting…' : 'Delete role'}
      </button>
      {error ? <span className="max-w-xs text-right text-xs text-rose-600" role="alert">{error}</span> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// My account
// ---------------------------------------------------------------------------

export function MyProfileForm({ fullName, mobile, email }: { fullName: string | null; mobile: string | null; email: string }) {
  const [state, action] = useFormState<StaffFormState, FormData>(updateMyProfileAction, {});
  const err = (name: string) => state.fieldErrors?.[name];
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Full name" htmlFor="me-name" error={err('full_name')}>
          <input id="me-name" name="full_name" className="input" defaultValue={fullName ?? ''} />
        </Field>
        <Field label="Phone" htmlFor="me-mobile" error={err('mobile')}>
          <input id="me-mobile" name="mobile" type="tel" className="input" defaultValue={mobile ?? ''} />
        </Field>
        <Field label="Email (sign-in)" htmlFor="me-email" hint="Ask an admin to change it">
          <input id="me-email" className="input bg-slate-50" value={email} readOnly />
        </Field>
      </div>
      <Submit label="Save details" />
    </form>
  );
}

export function ChangeMyPasswordForm() {
  const [state, action] = useFormState<StaffFormState, FormData>(changeMyPasswordAction, {});
  const err = (name: string) => state.fieldErrors?.[name];
  return (
    <form action={action} className="space-y-4" noValidate key={state.success}>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label="Current password" htmlFor="current_password" error={err('current_password')}>
        <input id="current_password" name="current_password" type="password" className="input max-w-sm" autoComplete="current-password" />
      </Field>
      <PasswordFields name="new_password" label="New password" err={err} autoComplete="new-password" />
      <Submit label="Change password" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/**
 * A new password with confirmation, a show toggle and a generator. The
 * generated password is shown so it can be copied and shared privately.
 */
function PasswordFields({
  name,
  label = 'Password',
  err,
  autoComplete = 'new-password',
}: {
  name: string;
  label?: string;
  err: (name: string) => string | undefined;
  autoComplete?: string;
}) {
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);

  function generate() {
    // 14 characters from an unambiguous alphabet, guaranteed a letter and digit.
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = letters + digits + '!@#$%';
    const bytes = crypto.getRandomValues(new Uint32Array(14));
    const chars = [...bytes].map((b, i) => (i === 0 ? letters : i === 1 ? digits : all)[b % (i === 0 ? letters.length : i === 1 ? digits.length : all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const pw = chars.join('');
    setValue(pw);
    setConfirm(pw);
    setVisible(true);
  }

  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label={label} htmlFor={name} error={err(name)} hint="At least 10 characters, with a letter and a number">
        <div className="relative">
          <input
            id={name}
            name={name}
            type={visible ? 'text' : 'password'}
            className="input pr-10 font-mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete={autoComplete}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <Field label={`Confirm ${label.toLowerCase()}`} htmlFor={`${name}_confirm`} error={err(`${name}_confirm`)}>
        <input
          id={`${name}_confirm`}
          name={`${name}_confirm`}
          type={visible ? 'text' : 'password'}
          className="input font-mono"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete={autoComplete}
        />
      </Field>
      <button type="button" onClick={generate} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Generate a strong password
      </button>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Choice({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', checked ? 'border-blue-600 bg-blue-50 text-slate-900' : 'border-slate-200 text-slate-600')}>
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}
