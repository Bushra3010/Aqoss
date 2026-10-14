'use client';

import { useFormState } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { DemoResetLink } from '@/components/website/AuthForms';
import { requestPasswordReset, updatePassword, type AuthState } from '@/app/(auth)/actions';
import { AdminSubmit } from './AdminLoginForm';

/**
 * CRM password reset. Same actions as the website's; `area=admin` makes the
 * emailed link open /admin/reset-password and land on the dashboard after.
 */

function Feedback({ state }: { state: AuthState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.success) {
    return (
      <Alert tone="success">
        {state.success}
        {state.demoLink ? <DemoResetLink href={state.demoLink} /> : null}
      </Alert>
    );
  }
  return null;
}

export function AdminForgotPasswordForm({ initialError }: { initialError?: string }) {
  const [state, action] = useFormState(requestPasswordReset, { error: initialError });

  return (
    <form action={action} className="mt-5 space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="area" value="admin" />

      <Field label="Email" htmlFor="admin-email">
        <input id="admin-email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>

      <AdminSubmit label="Send reset link" busyLabel="Sending…" />
    </form>
  );
}

export function AdminResetPasswordForm() {
  const [state, action] = useFormState(updatePassword, {});

  return (
    <form action={action} className="mt-5 space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="area" value="admin" />

      <Field label="New password" htmlFor="admin-password" hint="At least 8 characters.">
        <input
          id="admin-password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm password" htmlFor="admin-confirm">
        <input
          id="admin-confirm"
          name="confirm"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <AdminSubmit label="Update password" busyLabel="Updating…" />
    </form>
  );
}
