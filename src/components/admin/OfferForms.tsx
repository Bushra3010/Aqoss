'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { saveCoupon, saveOffer, type OfferActionState } from '@/app/admin/offer-actions';
import { cn } from '@/lib/utils';

export interface HotelOption {
  id: string;
  name: string;
}

/**
 * Where an offer or coupon may apply. `locked` pins it to one hotel (a hotel's
 * own panel); otherwise `hotels` are the choices, and `allowAll` offers
 * "every hotel" — only to admins who are not limited to some properties.
 */
export interface HotelChoice {
  locked?: HotelOption;
  hotels: HotelOption[];
  allowAll: boolean;
}

const OFFER_TYPES = [
  ['SEASONAL', 'Seasonal'],
  ['EARLY_BIRD', 'Early bird'],
  ['LAST_MINUTE', 'Last minute'],
  ['PERCENTAGE', 'Percentage off'],
  ['FIXED', 'Fixed amount off'],
] as const;

export function OfferForm({ choice, returnTo }: { choice: HotelChoice; returnTo: string }) {
  const [state, action] = useFormState<OfferActionState, FormData>(saveOffer, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="return_to" value={returnTo} />
      {state.error ? <Alert>{state.error}</Alert> : null}

      <Section title="Offer" hint="Shown to guests on the hotel website, beside the booking card.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err('title')}>
              <input id="title" name="title" className="input" placeholder="Monsoon special — 20% off" maxLength={120} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={err('description')}>
              <textarea
                id="description"
                name="description"
                className="input min-h-20"
                maxLength={1000}
                placeholder="Stay between June and September and save on every night."
              />
            </Field>
          </div>
          <Field label="Kind of offer" htmlFor="offer_type" error={err('offer_type')}>
            <select id="offer_type" name="offer_type" className="input" defaultValue="SEASONAL">
              {OFFER_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Hotel" htmlFor="hotel_id" error={err('hotel_id')}>
            {choice.locked ? (
              <>
                <input type="hidden" name="hotel_id" value={choice.locked.id} />
                <input id="hotel_id" className="input bg-slate-50" value={choice.locked.name} readOnly />
              </>
            ) : (
              <select id="hotel_id" name="hotel_id" className="input" defaultValue={choice.allowAll ? '' : choice.hotels[0]?.id}>
                {choice.allowAll ? <option value="">All hotels</option> : null}
                {choice.hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Section>

      <DiscountFields err={err} />

      <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        An offer advertises a deal; it does not change the price at checkout on its own. To give guests the
        discount, also create a coupon code and mention it in the description.
      </p>

      <Actions label="Create offer" cancelHref={returnTo} />
    </form>
  );
}

export function CouponForm({ choice, returnTo }: { choice: HotelChoice; returnTo: string }) {
  const [state, action] = useFormState<OfferActionState, FormData>(saveCoupon, {});
  const [scope, setScope] = useState<'all' | 'some'>(choice.allowAll && !choice.locked ? 'all' : 'some');
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="return_to" value={returnTo} />
      {state.error ? <Alert>{state.error}</Alert> : null}

      <Section title="Coupon" hint="Guests type the code at checkout; the discount is checked and applied on the server.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" htmlFor="code" error={err('code')} hint="Letters, numbers and dashes. Not case-sensitive.">
            <input
              id="code"
              name="code"
              className="input font-mono uppercase"
              placeholder="MONSOON20"
              maxLength={30}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </Field>
          <Field label="Note (staff only)" htmlFor="description" error={err('description')}>
            <input id="description" name="description" className="input" placeholder="For the monsoon email campaign" maxLength={500} />
          </Field>
        </div>

        <fieldset className="mt-4">
          <legend className="label">Valid at</legend>
          {choice.locked ? (
            <>
              <input type="hidden" name="hotel_ids" value={choice.locked.id} />
              <p className="text-sm text-slate-700">{choice.locked.name} only</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {choice.allowAll ? (
                  <ScopeOption checked={scope === 'all'} onChange={() => setScope('all')} label="Every hotel" />
                ) : null}
                <ScopeOption checked={scope === 'some'} onChange={() => setScope('some')} label="Selected hotels" />
              </div>
              {scope === 'some' ? (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {choice.hotels.map((h) => (
                      <label key={h.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="hotel_ids" value={h.id} className="h-4 w-4 rounded border-slate-300" />
                        {h.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
          {err('hotel_ids') ? <p className="mt-1 text-xs text-rose-600">{err('hotel_ids')}</p> : null}
        </fieldset>
      </Section>

      <DiscountFields err={err} />

      <Section title="Limits" hint="Leave blank for no limit.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum booking (₹)" htmlFor="min_booking_amount" error={err('min_booking_amount')}>
            <input id="min_booking_amount" name="min_booking_amount" type="number" min={0} className="input" placeholder="0" />
          </Field>
          <Field label="Total uses" htmlFor="usage_limit" error={err('usage_limit')}>
            <input id="usage_limit" name="usage_limit" type="number" min={1} className="input" placeholder="Unlimited" />
          </Field>
          <Field label="Uses per guest" htmlFor="usage_limit_per_user" error={err('usage_limit_per_user')}>
            <input id="usage_limit_per_user" name="usage_limit_per_user" type="number" min={1} className="input" placeholder="Unlimited" />
          </Field>
        </div>
      </Section>

      <Actions label="Create coupon" cancelHref={returnTo} />
    </form>
  );
}

// ---------------------------------------------------------------------------

function DiscountFields({ err }: { err: (name: string) => string | undefined }) {
  const [kind, setKind] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');

  return (
    <Section title="Discount">
      <div className="grid gap-4 sm:grid-cols-3">
        <fieldset>
          <legend className="label">Discount as</legend>
          <div className="flex gap-2">
            <ScopeOption name="discount_kind" value="PERCENT" checked={kind === 'PERCENT'} onChange={() => setKind('PERCENT')} label="Percent" />
            <ScopeOption name="discount_kind" value="AMOUNT" checked={kind === 'AMOUNT'} onChange={() => setKind('AMOUNT')} label="Amount (₹)" />
          </div>
        </fieldset>
        <Field label={kind === 'PERCENT' ? 'Percent off' : 'Rupees off'} htmlFor="discount_value" error={err('discount_value')}>
          <input
            id="discount_value"
            name="discount_value"
            type="number"
            min={1}
            max={kind === 'PERCENT' ? 90 : undefined}
            className="input"
            placeholder={kind === 'PERCENT' ? '15' : '800'}
          />
        </Field>
        {kind === 'PERCENT' ? (
          <Field label="Max discount (₹)" htmlFor="max_discount" error={err('max_discount')} hint="Optional cap.">
            <input id="max_discount" name="max_discount" type="number" min={1} className="input" placeholder="No cap" />
          </Field>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Starts" htmlFor="valid_from" error={err('valid_from')} hint="Blank = from today.">
          <input id="valid_from" name="valid_from" type="date" className="input" />
        </Field>
        <Field label="Ends" htmlFor="valid_until" error={err('valid_until')} hint="Blank = no end date.">
          <input id="valid_until" name="valid_until" type="date" className="input" />
        </Field>
        <label className="flex items-center gap-2 self-center text-sm text-slate-700 sm:pt-5">
          <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
          Active now
        </label>
      </div>
    </Section>
  );
}

function ScopeOption({
  label,
  checked,
  onChange,
  name,
  value,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  name?: string;
  value?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
        checked ? 'border-blue-600 bg-blue-50 text-slate-900' : 'border-slate-200 text-slate-600',
      )}
    >
      <input type="radio" name={name ?? 'scope'} value={value} checked={checked} onChange={onChange} />
      {label}
    </label>
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

function Actions({ label, cancelHref }: { label: string; cancelHref: string }) {
  return (
    <div className="flex items-center gap-3">
      <SubmitButton label={label} />
      <Link href={cancelHref} className="btn-ghost">Cancel</Link>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}
