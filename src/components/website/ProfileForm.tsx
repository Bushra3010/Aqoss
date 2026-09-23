'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { updateProfile, changePassword, type ProfileState } from '@/app/dashboard/actions';

const initial: ProfileState = {};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Feedback({ state }: { state: ProfileState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function ProfileForm({
  profile,
}: {
  profile: {
    full_name: string;
    email: string;
    mobile: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    date_of_birth: string;
  };
}) {
  const [state, action] = useFormState(updateProfile, initial);
  const [pwState, pwAction] = useFormState(changePassword, initial);

  return (
    <>
      <form action={action} className="card space-y-4 p-6">
        <Feedback state={state} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name">
            <input id="full_name" name="full_name" className="input" defaultValue={profile.full_name} required />
          </Field>

          <Field label="Email" htmlFor="email" hint="Contact support to change your email address.">
            <input id="email" className="input" defaultValue={profile.email} disabled />
          </Field>

          <Field label="Mobile number" htmlFor="mobile">
            <input id="mobile" name="mobile" type="tel" className="input" defaultValue={profile.mobile} required />
          </Field>

          <Field label="Date of birth" htmlFor="date_of_birth">
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              className="input"
              defaultValue={profile.date_of_birth}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address_line1">
              <input id="address_line1" name="address_line1" className="input" defaultValue={profile.address_line1} />
            </Field>
          </div>

          <Field label="City" htmlFor="city">
            <input id="city" name="city" className="input" defaultValue={profile.city} />
          </Field>

          <Field label="State" htmlFor="state">
            <input id="state" name="state" className="input" defaultValue={profile.state} />
          </Field>

          <Field label="Postal code" htmlFor="postal_code">
            <input id="postal_code" name="postal_code" className="input" defaultValue={profile.postal_code} />
          </Field>
        </div>

        <Submit label="Save changes" />
      </form>

      <form action={pwAction} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
        <Feedback state={pwState} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="new-password">
            <input
              id="new-password"
              name="password"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <Field label="Confirm password" htmlFor="confirm-password">
            <input
              id="confirm-password"
              name="confirm"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
        </div>

        <Submit label="Change password" />
      </form>
    </>
  );
}
