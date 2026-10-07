'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Alert, Field } from '@/components/ui';
import { submitHotelRegistration, type RegisterFormState } from '@/app/admin/register-actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      // Not .btn-primary: that follows the per-hotel brand colour (see AdminLoginForm).
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Sending…' : 'Register hotel'}
    </button>
  );
}

/** "Register your hotel": a request a super admin reviews, never an account. */
export function HotelRegisterForm() {
  const [state, action] = useFormState<RegisterFormState, FormData>(submitHotelRegistration, {});
  const err = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="mt-5 flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />
        <p className="mt-3 font-semibold text-slate-900">Thank you — your registration is in.</p>
        <p className="mt-1 text-sm text-slate-500">
          Our team will check the details and contact you to set up your hotel. You will get your sign-in once it is approved.
        </p>
        <Link href="/admin/login" className="mt-5 text-sm font-semibold text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-5 space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}

      {/* Honeypot: hidden from people, filled in by bots. */}
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <Field label="Hotel name" htmlFor="reg-hotel" error={err.hotel_name}>
        <input id="reg-hotel" name="hotel_name" className="input" autoComplete="organization" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="reg-city" error={err.city}>
          <input id="reg-city" name="city" className="input" autoComplete="address-level2" required />
        </Field>
        <Field label="Number of rooms" htmlFor="reg-rooms" error={err.rooms}>
          <input id="reg-rooms" name="rooms" type="number" min={1} max={10000} inputMode="numeric" className="input" />
        </Field>
      </div>
      <Field label="Address" htmlFor="reg-address" error={err.address}>
        <input id="reg-address" name="address" className="input" autoComplete="street-address" />
      </Field>
      <Field label="Your name" htmlFor="reg-name" error={err.name}>
        <input id="reg-name" name="name" className="input" autoComplete="name" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="reg-email" error={err.email}>
          <input id="reg-email" name="email" type="email" className="input" autoComplete="email" required />
        </Field>
        <Field label="Phone" htmlFor="reg-phone" error={err.phone}>
          <input id="reg-phone" name="phone" type="tel" className="input" autoComplete="tel" required />
        </Field>
      </div>
      <Field label="Anything else? (optional)" htmlFor="reg-message" error={err.message}>
        <textarea id="reg-message" name="message" className="input min-h-20" maxLength={1500} />
      </Field>

      <Submit />
    </form>
  );
}
