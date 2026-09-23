'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import {
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from '@/app/(auth)/actions';

const initial: AuthState = {};

function Submit({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? busyLabel : label}
    </button>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action] = useFormState(signIn, initial);

  return (
    <form action={action} className="mt-6 space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="redirect" value={redirectTo} />

      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>

      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </Field>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-slate-600 underline">
          Forgot password?
        </Link>
      </div>

      <Submit label="Sign in" busyLabel="Signing in…" />
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useFormState(signUp, initial);

  return (
    <form action={action} className="mt-6 space-y-4">
      <Feedback state={state} />

      <Field label="Full name" htmlFor="full_name">
        <input id="full_name" name="full_name" className="input" autoComplete="name" required />
      </Field>

      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>

      <Field label="Mobile number" htmlFor="mobile">
        <input id="mobile" name="mobile" type="tel" className="input" autoComplete="tel" required />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Address (optional)" htmlFor="address">
        <input id="address" name="address" className="input" autoComplete="street-address" />
      </Field>

      <Submit label="Create account" busyLabel="Creating…" />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormState(requestPasswordReset, initial);

  return (
    <form action={action} className="mt-6 space-y-4">
      <Feedback state={state} />

      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>

      <Submit label="Send reset link" busyLabel="Sending…" />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useFormState(updatePassword, initial);

  return (
    <form action={action} className="mt-6 space-y-4">
      <Feedback state={state} />

      <Field label="New password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirm">
        <input
          id="confirm"
          name="confirm"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Submit label="Update password" busyLabel="Updating…" />
    </form>
  );
}
