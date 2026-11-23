'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { registerPropertyOwner, type RegisterFormState } from '@/app/admin/register-actions';
import { propertyType } from '@/lib/listing';
import { FormRow, FormSection, StepBody } from './parts';
import { PropertyTypePicker } from './PropertyTypePicker';
import { ErrorBanner } from './ScrollTop';
import { StepFooter } from './StepFooter';

/**
 * An owner listing from the website: the same type picker as the CRM, then
 * their login and the property's name. Saving creates both and opens the rest
 * of the listing in the CRM.
 */
export function OwnerSignup() {
  const [type, setType] = useState<string | null>(null);
  const [phase, setPhase] = useState<'type' | 'account'>('type');
  const [state, action] = useFormState<RegisterFormState, FormData>(registerPropertyOwner, {});
  const top = useRef<HTMLDivElement>(null);
  const err = (name: string) => state?.fieldErrors?.[name];
  const chosen = propertyType(type);

  function go(next: 'type' | 'account') {
    setPhase(next);
  }

  // After the other screen renders, bring its top into view (not on first load).
  const lastPhase = useRef(phase);
  useEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    top.current?.scrollIntoView({ block: 'start' });
  }, [phase]);

  return (
    <div ref={top} className="scroll-mt-4">
      {phase === 'account' && chosen ? (
        <form action={action} noValidate className="rounded-2xl border border-slate-200 bg-white">
          <input type="hidden" name="property_type" value={chosen.key} />
          {/* Honeypot: hidden from people, filled in by bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website_url">Website</label>
            <input id="website_url" name="website_url" tabIndex={-1} autoComplete="off" />
          </div>

          <StepBody title="Create your account" description="You'll use this to sign in, finish your listing and, once it's live, manage bookings.">
            <ErrorBanner state={state} />

            <FormSection title="Your property">
              <FormRow label="Type of property">
                <div className="flex items-center gap-3">
                  <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <Image src={chosen.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{chosen.label}</span>
                  <button type="button" onClick={() => go('type')} className="text-sm font-semibold text-blue-700 hover:underline">
                    Change
                  </button>
                </div>
              </FormRow>
              <FormRow label="Name of the property" hint="As on the property documents" htmlFor="property_name" error={err('property_name')} required>
                <input id="property_name" name="property_name" className="input" maxLength={160} placeholder="Enter the full name" />
              </FormRow>
            </FormSection>

            <FormSection title="About you" description="The property's owner or manager">
              <FormRow label="Your name" htmlFor="full_name" error={err('full_name')} required>
                <input id="full_name" name="full_name" className="input" autoComplete="name" maxLength={120} />
              </FormRow>
              <FormRow label="Email" hint="Your sign-in, and where we write to you" htmlFor="email" error={err('email')} required>
                <input id="email" name="email" type="email" className="input" autoComplete="email" />
              </FormRow>
              <FormRow label="Mobile number" htmlFor="mobile" error={err('mobile')} required>
                <input id="mobile" name="mobile" type="tel" className="input" autoComplete="tel" placeholder="+91 98765 43210" />
              </FormRow>
              <FormRow label="Password" hint="At least 8 characters" htmlFor="password" error={err('password')} required>
                <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={72} />
              </FormRow>
            </FormSection>

            <p className="text-sm text-slate-500">
              By continuing you agree to the{' '}
              <Link href="/terms" className="font-medium text-blue-700 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium text-blue-700 hover:underline">
                Privacy Policy
              </Link>
              . AQOSS checks every listing before it goes live.
            </p>
          </StepBody>

          <StepFooter onBack={() => go('type')} submitLabel="Create account & continue" />
        </form>
      ) : (
        <PropertyTypePicker value={type} onChange={setType} onContinue={() => go('account')} cancelHref="/" continueLabel="Continue" />
      )}
    </div>
  );
}
