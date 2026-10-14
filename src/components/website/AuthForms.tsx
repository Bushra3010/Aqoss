'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
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

/** Demo mode only: the reset link stands in for the email it would be in. */
export function DemoResetLink({ href }: { href: string }) {
  return (
    <a href={href} className="mt-2 block font-semibold underline">
      Open the reset link
    </a>
  );
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

/**
 * Pops up when sign-up rejects the email address. `state` is a new object on
 * every submission, so a second bad address opens it again.
 */
function InvalidEmailDialog({ state, onClose }: { state: AuthState; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (state.invalidEmail && !ref.current?.open) ref.current?.showModal();
  }, [state]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="invalid-email-title"
      className="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/40"
    >
      <h2 id="invalid-email-title" className="text-base font-bold text-slate-900">
        Please enter a valid email
      </h2>
      <p className="mt-2 text-sm text-slate-500">{state.error}</p>
      <div className="mt-5 flex justify-end">
        {/* The dialog sits inside the sign-up form, so this must not be a submit button. */}
        <button type="button" className="btn-primary" onClick={() => ref.current?.close()} autoFocus>
          OK
        </button>
      </div>
    </dialog>
  );
}

export function RegisterForm() {
  const [state, action] = useFormState(signUp, initial);
  const emailRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.invalidEmail ? null : <Feedback state={state} />}
      <InvalidEmailDialog
        state={state}
        onClose={() => {
          emailRef.current?.focus();
          emailRef.current?.select();
        }}
      />

      <Field label="Full name" htmlFor="full_name">
        <input id="full_name" name="full_name" className="input" autoComplete="name" required />
      </Field>

      <Field label="Email" htmlFor="email" error={state.invalidEmail ? 'Enter a valid email address.' : undefined}>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          aria-invalid={state.invalidEmail || undefined}
          required
        />
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

export function ForgotPasswordForm({ initialError }: { initialError?: string }) {
  const [state, action] = useFormState(requestPasswordReset, { error: initialError });

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
