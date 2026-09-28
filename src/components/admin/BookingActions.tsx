'use client';

import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui';
import { adminCancelBooking, adminSetBookingStatus, adminRefund } from '@/app/admin/actions';
import { formatCurrency } from '@/lib/utils';

/**
 * Staff actions on a booking (PRD §26).
 * Each one is gated by the role's permissions and confirms before it runs.
 */
export function BookingActions({
  bookingId,
  status,
  paymentStatus,
  refundable,
  currency,
  permissions,
}: {
  bookingId: string;
  status: string;
  paymentStatus: string;
  refundable: number;
  currency: string;
  permissions: { checkin: boolean; cancel: boolean; refund: boolean };
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'cancel' | 'refund'>('none');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(refundable);

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await fn().catch(() => ({ error: 'That action could not be completed.' }) as { error?: string; message?: string });
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message ?? null);
        setMode('none');
      }
    });
  }

  const closed = ['CANCELLED', 'REFUNDED'].includes(status);

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Actions</h2>

      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-3">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {permissions.checkin && status === 'CONFIRMED' ? (
          <button
            type="button"
            className="btn-primary w-full"
            disabled={pending}
            onClick={() => run(() => adminSetBookingStatus(bookingId, 'CHECKED_IN'))}
          >
            Check in
          </button>
        ) : null}

        {permissions.checkin && status === 'CHECKED_IN' ? (
          <button
            type="button"
            className="btn-primary w-full"
            disabled={pending}
            onClick={() => run(() => adminSetBookingStatus(bookingId, 'CHECKED_OUT'))}
          >
            Check out
          </button>
        ) : null}

        {permissions.checkin && status === 'PENDING' ? (
          <button
            type="button"
            className="btn-outline w-full"
            disabled={pending}
            onClick={() => run(() => adminSetBookingStatus(bookingId, 'CONFIRMED'))}
          >
            Mark confirmed
          </button>
        ) : null}

        {permissions.cancel && !closed && status !== 'CHECKED_OUT' ? (
          mode === 'cancel' ? (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <label className="label" htmlFor="cancel-reason">Cancellation reason</label>
              <input
                id="cancel-reason"
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Guest request"
              />
              <p className="text-xs text-slate-500">
                This releases the rooms and any transport seats back to inventory.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending}
                  onClick={() => run(() => adminCancelBooking(bookingId, reason))}
                >
                  {pending ? 'Cancelling…' : 'Confirm'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setMode('none')}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-outline w-full" onClick={() => setMode('cancel')}>
              Cancel booking
            </button>
          )
        ) : null}

        {permissions.refund && refundable > 0 && paymentStatus !== 'REFUNDED' ? (
          mode === 'refund' ? (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <label className="label" htmlFor="refund-amount">
                Refund amount (up to {formatCurrency(refundable, currency)})
              </label>
              <input
                id="refund-amount"
                type="number"
                min={1}
                max={refundable}
                step="0.01"
                className="input"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <input
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                aria-label="Refund reason"
              />
              <p className="text-xs text-slate-500">
                Online payments go back through the gateway; money taken at the hotel must be handed back by you.
                A refund doesn&apos;t lower the booking&apos;s price — for a shorter stay, edit the booking first.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending}
                  onClick={() => run(() => adminRefund(bookingId, amount, reason))}
                >
                  {pending ? 'Processing…' : 'Issue refund'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setMode('none')}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-outline w-full"
              onClick={() => {
                setAmount(refundable);
                setMode('refund');
              }}
            >
              Refund {formatCurrency(refundable, currency)}
            </button>
          )
        ) : null}
      </div>

      {!permissions.checkin && !permissions.cancel && !permissions.refund ? (
        <p className="mt-3 text-sm text-slate-500">Your role has read-only access to bookings.</p>
      ) : null}
    </section>
  );
}
