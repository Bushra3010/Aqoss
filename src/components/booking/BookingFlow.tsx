'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Field } from '@/components/ui';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import type {
  AvailabilityResult,
  PriceBreakdown,
  RoomTypeSummary,
  TransportSlot,
} from '@/types';

/**
 * The guest-facing booking flow (PRD §13, §51).
 *
 * Guest details → transport → price summary → payment. Every price on screen
 * comes from /api/pricing/quote, and the booking itself is created and priced
 * again by the server, so this component never decides what anything costs.
 */

interface Props {
  hotel: { id: string; name: string; currency: string; check_in_time: string; check_out_time: string };
  websiteId: string;
  search: { check_in: string; check_out: string; adults: number; children: number; rooms: number };
  room: AvailabilityResult;
  roomDetails: RoomTypeSummary | null;
  transportOptions: TransportSlot[];
  signedIn: boolean;
  prefill: { name: string; email: string; phone: string; address: string };
}

type Step = 'guest' | 'transport' | 'review' | 'payment';

const STEPS: { key: Step; label: string }[] = [
  { key: 'guest', label: 'Guest details' },
  { key: 'transport', label: 'Transport' },
  { key: 'review', label: 'Price summary' },
  { key: 'payment', label: 'Payment' },
];

export function BookingFlow(props: Props) {
  const router = useRouter();
  const { hotel, room, search, transportOptions } = props;

  const [step, setStep] = useState<Step>('guest');
  const [guest, setGuest] = useState({
    name: props.prefill.name,
    email: props.prefill.email,
    phone: props.prefill.phone,
    address: props.prefill.address,
    special_requests: '',
  });

  const [transport, setTransport] = useState<Record<string, number>>({});
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [hold, setHold] = useState<{ id: string; expiresAt: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const holdRequested = useRef(false);

  const roomsPayload = useMemo(
    () => [
      {
        room_type_id: room.room_type_id,
        rooms: search.rooms,
        adults: search.adults,
        children: search.children,
      },
    ],
    [room.room_type_id, search.rooms, search.adults, search.children],
  );

  const transportPayload = useMemo(
    () =>
      Object.entries(transport)
        .filter(([, seats]) => seats > 0)
        .map(([slot_id, seats]) => ({ slot_id, seats })),
    [transport],
  );

  // ---- Server-side quote -------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function quote() {
      setQuoting(true);
      try {
        const response = await fetch('/api/pricing/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            check_in: search.check_in,
            check_out: search.check_out,
            rooms: roomsPayload,
            transport: transportPayload,
            coupon_code: appliedCoupon,
          }),
        });

        const json = await response.json();
        if (cancelled) return;

        if (!json.ok) {
          setError(json.error);
          if (json.code === 'INVALID_COUPON') {
            setAppliedCoupon(null);
            setCouponMessage(json.error);
          }
          return;
        }

        setBreakdown(json.data.breakdown);
        setError(null);
        if (json.data.coupon?.valid) setCouponMessage(json.data.coupon.message);
      } catch {
        if (!cancelled) setError('We could not calculate your price. Please try again.');
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }

    quote();
    return () => {
      cancelled = true;
    };
  }, [search.check_in, search.check_out, roomsPayload, transportPayload, appliedCoupon]);

  // ---- Hold the room once the guest reaches the summary (PRD §10) --------
  useEffect(() => {
    if (step !== 'review' || holdRequested.current) return;
    holdRequested.current = true;

    (async () => {
      try {
        const response = await fetch('/api/holds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_type_id: room.room_type_id,
            check_in: search.check_in,
            check_out: search.check_out,
            rooms: search.rooms,
          }),
        });
        const json = await response.json();
        if (json.ok) setHold({ id: json.data.hold_id, expiresAt: json.data.expires_at });
      } catch {
        // A failed hold is not fatal: the booking transaction still re-checks
        // availability, so the guest simply loses the reservation window.
      }
    })();
  }, [step, room.room_type_id, search.check_in, search.check_out, search.rooms]);

  // ---- Hold countdown ----------------------------------------------------
  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const left = Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, left));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold]);

  // ---- Actions -----------------------------------------------------------
  function validateGuest(): boolean {
    const errors: Record<string, string> = {};
    if (guest.name.trim().length < 2) errors.name = 'Please enter the guest name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!/^[+]?[0-9\s-]{7,20}$/.test(guest.phone.trim())) {
      errors.phone = 'Please enter a valid phone number.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setAppliedCoupon(code);
    setCouponMessage(null);
  }

  async function submitBooking() {
    if (!validateGuest()) {
      setStep('guest');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create the booking — inventory is consumed atomically server-side.
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: hotel.id,
          website_id: props.websiteId,
          check_in: search.check_in,
          check_out: search.check_out,
          rooms: roomsPayload,
          guest: {
            ...guest,
            adults: search.adults,
            children: search.children,
          },
          transport: transportPayload,
          coupon_code: appliedCoupon,
          hold_ids: hold ? [hold.id] : [],
          source: 'WEBSITE',
        }),
      });

      const booking = await bookingResponse.json();
      if (!booking.ok) throw new Error(booking.error);

      // 2. Open the payment order.
      const startResponse = await fetch('/api/payments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.data.booking_id }),
      });

      const payment = await startResponse.json();
      if (!payment.ok) throw new Error(payment.error);

      // 3. Hand off to the gateway. The mock gateway resolves immediately;
      //    a real one opens its checkout widget here and calls back.
      router.push(
        `/booking/pay?booking=${booking.data.booking_id}` +
          `&payment=${payment.data.payment_id}` +
          `&order=${encodeURIComponent(payment.data.order.orderId)}` +
          `&reference=${booking.data.reference}`,
      );
    } catch (err) {
      setError((err as Error).message || 'Unable to process booking. Please try again.');
      setSubmitting(false);
    }
  }

  const currency = hotel.currency;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Booking steps">
          {STEPS.map((s, i) => {
            const currentIndex = STEPS.findIndex((x) => x.key === step);
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ' +
                    (state === 'todo' ? 'bg-slate-200 text-slate-500' : 'text-white')
                  }
                  style={state !== 'todo' ? { backgroundColor: 'var(--brand-700)' } : undefined}
                >
                  {i + 1}
                </span>
                <span
                  className={
                    'text-sm ' + (state === 'current' ? 'font-semibold text-slate-900' : 'text-slate-500')
                  }
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 ? <span className="mx-1 text-slate-300">›</span> : null}
              </li>
            );
          })}
        </ol>

        {error ? (
          <div className="mb-5">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        {/* ---- Step 1: guest details ------------------------------------ */}
        {step === 'guest' ? (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Guest details</h2>
            {!props.signedIn ? (
              <p className="mt-1 text-sm text-slate-500">
                Booking as a guest.{' '}
                <Link href="/login" className="font-medium underline">
                  Sign in
                </Link>{' '}
                to keep this booking in your dashboard.
              </p>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="guest-name" error={fieldErrors.name}>
                <input
                  id="guest-name"
                  className="input"
                  value={guest.name}
                  onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                  autoComplete="name"
                  required
                />
              </Field>

              <Field label="Email" htmlFor="guest-email" error={fieldErrors.email}>
                <input
                  id="guest-email"
                  type="email"
                  className="input"
                  value={guest.email}
                  onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                  autoComplete="email"
                  required
                />
              </Field>

              <Field label="Mobile number" htmlFor="guest-phone" error={fieldErrors.phone}>
                <input
                  id="guest-phone"
                  type="tel"
                  className="input"
                  value={guest.phone}
                  onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                  autoComplete="tel"
                  required
                />
              </Field>

              <Field label="Address (optional)" htmlFor="guest-address">
                <input
                  id="guest-address"
                  className="input"
                  value={guest.address}
                  onChange={(e) => setGuest({ ...guest, address: e.target.value })}
                  autoComplete="street-address"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Special requests (optional)" htmlFor="guest-requests">
                  <textarea
                    id="guest-requests"
                    className="input min-h-24"
                    value={guest.special_requests}
                    onChange={(e) => setGuest({ ...guest, special_requests: e.target.value })}
                    placeholder="Early check-in, high floor, airport pickup…"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (validateGuest()) {
                    setStep(transportOptions.length ? 'transport' : 'review');
                  }
                }}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {/* ---- Step 2: transport ---------------------------------------- */}
        {step === 'transport' ? (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Add transport</h2>
            <p className="mt-1 text-sm text-slate-500">
              Optional. Seats are confirmed with your booking.
            </p>

            <ul className="mt-5 space-y-3">
              {transportOptions.map((slot) => (
                <li key={slot.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{slot.route?.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(slot.depart_date)} at {formatTime(slot.depart_time)}
                        {slot.vehicle_type ? ` · ${slot.vehicle_type}` : ''} ·{' '}
                        {slot.available_seats} seat{slot.available_seats === 1 ? '' : 's'} left
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(slot.price, currency)}
                      </span>
                      <select
                        className="input w-24"
                        aria-label={`Seats for ${slot.route?.name}`}
                        value={transport[slot.id] ?? 0}
                        onChange={(e) =>
                          setTransport({ ...transport, [slot.id]: Number(e.target.value) })
                        }
                      >
                        {Array.from({ length: Math.min(slot.available_seats, 10) + 1 }, (_, i) => i).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n === 0 ? 'None' : `${n} seat${n > 1 ? 's' : ''}`}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-between">
              <button type="button" className="btn-outline" onClick={() => setStep('guest')}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep('review')}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {/* ---- Step 3: review ------------------------------------------- */}
        {step === 'review' ? (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Review your booking</h2>

            {secondsLeft !== null ? (
              <p className={`mt-2 text-sm ${secondsLeft < 120 ? 'text-rose-600' : 'text-slate-500'}`}>
                {secondsLeft > 0
                  ? `We are holding this room for ${Math.floor(secondsLeft / 60)}:${String(
                      secondsLeft % 60,
                    ).padStart(2, '0')}.`
                  : 'Your reservation hold has expired — availability will be rechecked when you pay.'}
              </p>
            ) : null}

            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Hotel" value={hotel.name} />
              <Row label="Room" value={`${search.rooms} × ${room.name}`} />
              <Row
                label="Dates"
                value={`${formatDate(search.check_in)} → ${formatDate(search.check_out)} (${room.nights} night${
                  room.nights > 1 ? 's' : ''
                })`}
              />
              <Row
                label="Guests"
                value={`${search.adults} adult${search.adults > 1 ? 's' : ''}${
                  search.children ? `, ${search.children} child${search.children > 1 ? 'ren' : ''}` : ''
                }`}
              />
              <Row label="Check-in" value={`From ${formatTime(hotel.check_in_time)}`} />
              <Row label="Check-out" value={`By ${formatTime(hotel.check_out_time)}`} />
              <Row label="Guest" value={`${guest.name} · ${guest.email} · ${guest.phone}`} />
            </dl>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <label className="label" htmlFor="coupon">Have a coupon?</label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  className="input"
                  placeholder="WELCOME10"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                />
                <button type="button" className="btn-outline shrink-0" onClick={applyCoupon}>
                  Apply
                </button>
                {appliedCoupon ? (
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput('');
                      setCouponMessage(null);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {couponMessage ? <p className="mt-2 text-sm text-slate-600">{couponMessage}</p> : null}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setStep(transportOptions.length ? 'transport' : 'guest')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-accent"
                onClick={submitBooking}
                disabled={submitting || quoting || !breakdown}
              >
                {submitting ? 'Processing…' : 'Proceed to payment'}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* ---- Sticky price summary ---------------------------------------- */}
      <aside className="lg:col-span-1">
        <div className="card sticky top-24 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Price summary</h2>

          {quoting && !breakdown ? (
            <p className="mt-4 text-sm text-slate-500">Calculating…</p>
          ) : breakdown ? (
            <>
              <ul className="mt-4 space-y-2 text-sm">
                {breakdown.lines.map((line, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span className={line.kind === 'discount' ? 'text-emerald-700' : 'text-slate-600'}>
                      {line.label}
                      {line.detail ? (
                        <span className="block text-xs text-slate-400">{line.detail}</span>
                      ) : null}
                    </span>
                    <span
                      className={
                        line.kind === 'discount' ? 'shrink-0 text-emerald-700' : 'shrink-0 text-slate-900'
                      }
                    >
                      {formatCurrency(line.amount, breakdown.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(breakdown.total_amount, breakdown.currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Calculated by the property. Taxes included.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Price unavailable.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
