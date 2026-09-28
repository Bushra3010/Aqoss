'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Search } from 'lucide-react';
import { Alert, Field, StatusBadge } from '@/components/ui';
import { RecordPaymentForm } from '@/components/admin/BookingForms';
import {
  refundFromPaymentAction,
  searchBookingsForPayment,
  type PaymentFormState,
} from '@/app/admin/payment-actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

/** Refund part or all of one payment. */
export function RefundFromPaymentForm({
  paymentId,
  left,
  currency,
  atHotel,
}: {
  paymentId: string;
  left: number;
  currency: string;
  /** Money taken at the hotel is handed back by staff, not the gateway. */
  atHotel: boolean;
}) {
  const [state, action] = useFormState<PaymentFormState, FormData>(refundFromPaymentAction, {});

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="payment_id" value={paymentId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label={`Amount (up to ${formatCurrency(left, currency)})`} htmlFor="refund-amount">
        <input id="refund-amount" name="amount" type="number" min={1} max={left} step="0.01" defaultValue={left} className="input" />
      </Field>
      <Field label="Reason" htmlFor="refund-reason" hint="Shown in the refund history">
        <input id="refund-reason" name="reason" className="input" maxLength={300} placeholder="Shortened stay" />
      </Field>
      <p className="text-xs text-slate-500">
        {atHotel
          ? 'This payment was taken at the hotel — the refund is recorded here, and you hand the money back to the guest.'
          : 'This payment was made online — the refund goes back through the payment gateway.'}{' '}
        A refund doesn&apos;t lower the booking&apos;s price; for a shorter stay, edit the booking first.
      </p>
      <Submit label="Refund" />
    </form>
  );
}

interface DueBooking {
  id: string;
  reference: string;
  guest_name: string;
  guest_phone: string;
  hotel: string;
  check_in: string;
  check_out: string;
  status: string;
  due: number;
  currency: string;
}

/**
 * "Record payment" from the Payments section: find the booking — by reference,
 * guest name, email or phone — among those that still owe money, then take
 * the payment against it.
 */
export function RecordPaymentPicker({ hotelId, returnBase }: { hotelId?: string; returnBase: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DueBooking[] | null>(null);
  const [chosen, setChosen] = useState<DueBooking | null>(null);
  const latest = useRef('');

  useEffect(() => {
    const key = `${q}|${hotelId ?? ''}`;
    latest.current = key;
    const timer = setTimeout(async () => {
      const rows = (await searchBookingsForPayment({ q, hotelId })) as DueBooking[];
      if (latest.current === key) setResults(rows);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, hotelId]);

  if (chosen) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-900">{chosen.reference}</p>
              <p className="text-sm text-slate-500">
                {chosen.guest_name} · {chosen.guest_phone}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {chosen.hotel} · {formatDate(chosen.check_in)} → {formatDate(chosen.check_out)}
              </p>
            </div>
            <StatusBadge status={chosen.status} />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Still owed: <span className="font-bold text-slate-900">{formatCurrency(chosen.due, chosen.currency)}</span>
          </p>
          <button type="button" className="btn-ghost mt-4 px-0" onClick={() => setChosen(null)}>
            ← Choose a different booking
          </button>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">Payment received</h2>
          <RecordPaymentForm bookingId={chosen.id} balance={chosen.due} currency={chosen.currency} returnBase={returnBase} />
        </section>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <label htmlFor="due-search" className="label">Find the booking</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="due-search"
          type="search"
          autoFocus
          className="input pl-9"
          placeholder="Booking reference, guest name, email or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">Only bookings that still owe money are listed.</p>

      <ul className="mt-4 divide-y divide-slate-100" aria-live="polite">
        {results === null ? (
          <li className="py-3 text-sm text-slate-500">Loading…</li>
        ) : results.length === 0 ? (
          <li className="py-3 text-sm text-slate-500">{q ? `No booking with a balance matches “${q}”.` : 'No bookings owe money right now.'}</li>
        ) : (
          results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setChosen(b)}
                className={cn('flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 text-left hover:bg-slate-50')}
              >
                <span className="min-w-[9rem] font-semibold text-slate-900">{b.reference}</span>
                <span className="min-w-0 flex-1 text-sm text-slate-600">
                  {b.guest_name}
                  <span className="block text-xs text-slate-400">
                    {b.hotel} · {formatDate(b.check_in)} → {formatDate(b.check_out)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-amber-700">{formatCurrency(b.due, b.currency)} due</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
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
