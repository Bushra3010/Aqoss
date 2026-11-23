'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Rocket, Send } from 'lucide-react';
import { publishListingStep, submitListingStep, type ListingActionState } from '@/app/admin/listing-actions';
import { websiteUrl } from '@/lib/site-url';
import { FormSection, StepBody } from './parts';
import { BAR } from './StepFooter';
import { ErrorBanner } from './ScrollTop';

function PublishButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn min-w-40 bg-green-700 text-white shadow-sm hover:bg-green-800"
      disabled={!ready || pending}
    >
      <Rocket className="h-4 w-4" aria-hidden="true" />
      {pending ? 'Publishing…' : 'Publish website'}
    </button>
  );
}

/**
 * Go Live while the site is not live yet: the checklist (`children`), the
 * website address, then put the hotel and its website live.
 */
export function PublishForm({
  hotelId,
  slug,
  ready,
  backHref,
  title,
  description,
  children,
}: {
  hotelId: string;
  slug: string;
  ready: boolean;
  backHref: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [state, action] = useFormState<ListingActionState, FormData>(publishListingStep, {});
  const [value, setValue] = useState(slug);
  // Shows the address exactly as this deployment serves hotels: a subdomain,
  // or a path on hosts that cannot have subdomains.
  const [before, after] = websiteUrl('__slug__').split('__slug__');
  const error = state?.fieldErrors?.slug;

  return (
    <form action={action} noValidate>
      <input type="hidden" name="hotel_id" value={hotelId} />

      <StepBody title={title} description={description}>
        <ErrorBanner state={state} />
        {children}

        <FormSection title="Website address" description="Where guests will find the website. It cannot change once the site is live.">
          {/* Full width: the address is long, and a half-width column would cut it off. */}
          <div className="py-4">
            <label htmlFor="slug" className="text-sm font-semibold text-slate-900">
              Address<span className="text-rose-600" aria-hidden="true"> *</span>
            </label>
            <div className="mt-2 flex min-w-0 flex-wrap items-stretch overflow-hidden rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 sm:flex-nowrap">
              <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{before}</span>
              <input
                id="slug"
                name="slug"
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                className="min-w-[8rem] flex-1 border-0 px-2 py-2.5 text-sm font-medium text-slate-900 focus:outline-none"
                maxLength={63}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
              />
              {after ? <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{after}</span> : null}
            </div>
            {error ? (
              <p className="mt-1.5 text-sm text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </FormSection>
      </StepBody>

      <div className={BAR}>
        <Link href={backHref} className="btn-ghost text-blue-700">
          Back
        </Link>
        <div className="flex items-center gap-3">
          {!ready ? <p className="text-sm text-slate-500">Finish the steps marked in red first.</p> : null}
          <PublishButton ready={ready} />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn min-w-40 bg-green-700 text-white shadow-sm hover:bg-green-800" disabled={!ready || pending}>
      <Send className="h-4 w-4" aria-hidden="true" />
      {pending ? 'Sending…' : 'Submit for approval'}
    </button>
  );
}

/**
 * Go Live for a hotel's own admin (an owner who listed from the website): they
 * cannot publish, only send the finished listing to AQOSS for approval.
 */
export function SubmitForm({
  hotelId,
  ready,
  submittedAt,
  backHref,
  children,
}: {
  hotelId: string;
  ready: boolean;
  submittedAt: string | null;
  backHref: string;
  children: React.ReactNode;
}) {
  const [state, action] = useFormState<ListingActionState, FormData>(submitListingStep, {});
  return (
    <form action={action}>
      <input type="hidden" name="hotel_id" value={hotelId} />
      <StepBody
        title={submittedAt ? 'Waiting for approval' : 'Submit for approval'}
        description={
          submittedAt
            ? 'AQOSS is checking your listing and will put it live. You can keep editing it meanwhile.'
            : 'When every step marked in red is done, send the listing to AQOSS. We check it and put your website live.'
        }
      >
        <ErrorBanner state={state} />
        {children}
      </StepBody>
      <div className={BAR}>
        <Link href={backHref} className="btn-ghost text-blue-700">
          Back
        </Link>
        {submittedAt ? (
          <p className="text-sm font-medium text-amber-700">
            Sent on {new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        ) : (
          <div className="flex items-center gap-3">
            {!ready ? <p className="text-sm text-slate-500">Finish the steps marked in red first.</p> : null}
            <SubmitButton ready={ready} />
          </div>
        )}
      </div>
    </form>
  );
}
