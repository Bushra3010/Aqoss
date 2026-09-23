'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { adminSignIn, type AdminAuthState } from '@/app/admin/actions';

const initial: AdminAuthState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      // Not .btn-primary: that follows the per-hotel brand colour, and the CRM
      // is always blue regardless of which website you came from.
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function AdminLoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError?: string;
}) {
  const [state, action] = useFormState(adminSignIn, { error: initialError, ...initial });

  return (
    <form action={action} className="mt-5 space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="redirect" value={redirectTo} />

      <Field label="Email" htmlFor="admin-email">
        <input id="admin-email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>

      <Field label="Password" htmlFor="admin-password">
        <input
          id="admin-password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </Field>

      <Submit />
    </form>
  );
}
