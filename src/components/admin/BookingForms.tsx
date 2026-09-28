'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Field } from '@/components/ui';
import { SearchSelect } from '@/components/admin/SearchSelect';
import {
  createStaffBookingAction,
  modifyBookingAction,
  previewStaffQuote,
  recordPaymentAction,
  updateBookingGuestAction,
  type BookingFormState,
  type QuotePreview,
} from '@/app/admin/booking-actions';
import { cn, formatCurrency, todayISO, toISODate } from '@/lib/utils';

export interface BookableRoomType {
  id: string;
  hotel_id: string;
  name: string;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
}

export interface RoomLine {
  room_type_id: string;
  rooms: number;
  adults: number;
  children: number;
}

const PAYMENT_METHODS = [
  ['cash', 'Cash'],
  ['upi', 'UPI'],
  ['card', 'Card (machine)'],
  ['bank_transfer', 'Bank transfer'],
] as const;

// ---------------------------------------------------------------------------
// New booking
// ---------------------------------------------------------------------------

/**
 * A booking taken by staff. `hotel` fixes the hotel (a hotel's own panel);
 * otherwise `hotels` offers a searchable picker. The price on the right is
 * the same quote the save uses, refreshed as the stay changes.
 */
export function NewBookingForm({
  hotel,
  hotels,
  roomTypes,
  canTakePayment,
  returnBase,
}: {
  hotel?: { id: string; name: string };
  hotels?: { id: string; name: string; city: string | null }[];
  roomTypes: BookableRoomType[];
  canTakePayment: boolean;
  returnBase: string;
}) {
  const [state, action] = useFormState<BookingFormState, FormData>(createStaffBookingAction, {});
  const [hotelId, setHotelId] = useState(hotel?.id ?? '');
  const [stay, setStay] = useState({ checkIn: todayISO(), checkOut: todayISO(1) });
  const [lines, setLines] = useState<RoomLine[]>([]);
  const [coupon, setCoupon] = useState('');
  const [paying, setPaying] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const err = (name: string) => state.fieldErrors?.[name];

  const hotelRooms = useMemo(() => roomTypes.filter((r) => r.hotel_id === hotelId), [roomTypes, hotelId]);

  // A new hotel starts with one line of its first room type.
  useEffect(() => {
    setLines(hotelRooms.length ? [{ room_type_id: hotelRooms[0].id, rooms: 1, adults: 2, children: 0 }] : []);
  }, [hotelRooms]);

  const quote = useLiveQuote({ hotelId, checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: lines, couponCode: coupon });
  const total = quote?.ok ? quote.breakdown.total_amount : null;

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <input type="hidden" name="return_base" value={returnBase} />
      <input type="hidden" name="rooms" value={JSON.stringify(lines)} />

      <div className="min-w-0 space-y-6">
        {state.error ? <Alert>{state.error}</Alert> : null}

        <Section title="Stay">
          <div className="grid gap-4 sm:grid-cols-3">
            {hotel ? (
              <input type="hidden" name="hotel_id" value={hotel.id} />
            ) : (
              <Field label="Hotel" htmlFor="hotel_id" error={err('hotel_id')}>
                <SearchSelect
                  name="hotel_id"
                  label="Hotel"
                  placeholder="Search hotel or city"
                  options={(hotels ?? []).map((h) => ({ value: h.id, label: h.name, hint: h.city }))}
                  submitOnChange={false}
                  onChange={setHotelId}
                />
              </Field>
            )}
            <Field label="Check-in" htmlFor="check_in" error={err('check_in')}>
              <input
                id="check_in"
                name="check_in"
                type="date"
                className="input"
                min={todayISO()}
                value={stay.checkIn}
                onChange={(e) => {
                  const checkIn = e.target.value;
                  // Keep at least one night.
                  setStay((s) => ({ checkIn, checkOut: s.checkOut > checkIn ? s.checkOut : addDays(checkIn, 1) }));
                }}
              />
            </Field>
            <Field label="Check-out" htmlFor="check_out" error={err('check_out')}>
              <input
                id="check_out"
                name="check_out"
                type="date"
                className="input"
                min={addDays(stay.checkIn, 1)}
                value={stay.checkOut}
                onChange={(e) => setStay((s) => ({ ...s, checkOut: e.target.value }))}
              />
            </Field>
          </div>

          <RoomLinesEditor lines={lines} onChange={setLines} roomTypes={hotelRooms} error={err('rooms')} hotelChosen={Boolean(hotelId)} />
        </Section>

        <Section title="Guest">
          <GuestFields err={err} />
        </Section>

        <Section title="Booking">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Taken by" htmlFor="source">
              <select id="source" name="source" className="input" defaultValue="PHONE">
                <option value="PHONE">Phone</option>
                <option value="CRM">Walk-in / at the desk</option>
              </select>
            </Field>
            <Field label="Coupon code" htmlFor="coupon_code" error={err('coupon_code')} hint="Optional.">
              <input
                id="coupon_code"
                name="coupon_code"
                className="input font-mono uppercase"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                autoComplete="off"
              />
            </Field>
          </div>
        </Section>

        {canTakePayment ? (
          <Section title="Payment">
            <div className="flex flex-wrap gap-2">
              <Choice checked={!paying} onChange={() => setPaying(false)} label="Guest pays later" />
              <Choice
                checked={paying}
                onChange={() => {
                  setPaying(true);
                  if (!paidAmount && total != null) setPaidAmount(String(total));
                }}
                label="Paid now"
              />
            </div>
            {paying ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Amount received (₹)" htmlFor="payment_amount" error={err('payment_amount')} hint={total != null ? `Total ${formatCurrency(total)}` : undefined}>
                  <input id="payment_amount" name="payment_amount" type="number" min={1} step="0.01" className="input" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                </Field>
                <Field label="Method" htmlFor="payment_method" error={err('payment_method')}>
                  <select id="payment_method" name="payment_method" className="input" defaultValue="cash">
                    {PAYMENT_METHODS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Reference" htmlFor="payment_reference" hint="UPI / card slip no. — optional">
                  <input id="payment_reference" name="payment_reference" className="input" maxLength={100} />
                </Field>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                The booking is saved as pending. Record the payment on the booking later, or mark it confirmed.
              </p>
            )}
          </Section>
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <QuotePanel quote={quote} />
        <div className="mt-4 flex items-center gap-3">
          <Submit label="Create booking" disabled={!quote?.ok} />
          <Link href={returnBase} className="btn-ghost">Cancel</Link>
        </div>
      </aside>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Change an existing booking
// ---------------------------------------------------------------------------

/** New dates, rooms or party size for a booking, re-priced before saving. */
export function ChangeStayForm({
  bookingId,
  initial,
  roomTypes,
  returnBase,
  currency,
}: {
  bookingId: string;
  initial: { checkIn: string; checkOut: string; lines: RoomLine[] };
  roomTypes: BookableRoomType[];
  returnBase: string;
  currency: string;
}) {
  const [state, action] = useFormState<BookingFormState, FormData>(modifyBookingAction, {});
  const [stay, setStay] = useState({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [lines, setLines] = useState<RoomLine[]>(initial.lines);
  const err = (name: string) => state.fieldErrors?.[name];

  const unchanged =
    stay.checkIn === initial.checkIn &&
    stay.checkOut === initial.checkOut &&
    JSON.stringify(lines) === JSON.stringify(initial.lines);

  const quote = useLiveQuote({ bookingId, checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: lines, skip: unchanged });
  const newTotal = quote?.ok ? quote.breakdown.total_amount : null;
  const paid = quote?.ok ? quote.amountPaid ?? 0 : 0;

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="return_base" value={returnBase} />
      <input type="hidden" name="rooms" value={JSON.stringify(lines)} />
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Check-in" htmlFor="check_in" error={err('check_in')}>
          <input
            id="check_in"
            name="check_in"
            type="date"
            className="input"
            min={todayISO()}
            value={stay.checkIn}
            onChange={(e) => {
              const checkIn = e.target.value;
              setStay((s) => ({ checkIn, checkOut: s.checkOut > checkIn ? s.checkOut : addDays(checkIn, 1) }));
            }}
          />
        </Field>
        <Field label="Check-out" htmlFor="check_out" error={err('check_out')}>
          <input
            id="check_out"
            name="check_out"
            type="date"
            className="input"
            min={addDays(stay.checkIn, 1)}
            value={stay.checkOut}
            onChange={(e) => setStay((s) => ({ ...s, checkOut: e.target.value }))}
          />
        </Field>
      </div>

      <RoomLinesEditor lines={lines} onChange={setLines} roomTypes={roomTypes} error={err('rooms')} hotelChosen />

      {unchanged ? (
        <p className="text-sm text-slate-500">Change the dates or rooms to see the new price.</p>
      ) : (
        <>
          <QuotePanel quote={quote} />
          {newTotal != null ? (
            <p className={cn('rounded-lg px-4 py-3 text-sm', newTotal > paid ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900')}>
              {newTotal > paid
                ? `Guest has paid ${formatCurrency(paid, currency)} — ${formatCurrency(newTotal - paid, currency)} will be due.`
                : newTotal < paid
                  ? `Guest has paid ${formatCurrency(paid, currency)} — ${formatCurrency(paid - newTotal, currency)} more than the new total. Refund it from the booking page if needed.`
                  : 'Already fully paid.'}
              {quote?.ok && quote.couponDropped ? ` Coupon ${quote.couponDropped} no longer applies and will be removed.` : ''}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            Availability is checked when you save — the booking&apos;s own rooms are counted as free.
          </p>
        </>
      )}

      <div className="flex items-center gap-3">
        <Submit label="Save new dates & rooms" disabled={unchanged || !quote?.ok} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Guest details
// ---------------------------------------------------------------------------

export function GuestDetailsForm({
  bookingId,
  guest,
}: {
  bookingId: string;
  guest: { name: string; email: string; phone: string; address: string | null; special_requests: string | null };
}) {
  const [state, action] = useFormState<BookingFormState, FormData>(updateBookingGuestAction, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="booking_id" value={bookingId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <GuestFields err={err} initial={guest} />
      <Submit label="Save guest details" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Record a payment
// ---------------------------------------------------------------------------

export function RecordPaymentForm({
  bookingId,
  balance,
  currency,
  returnBase,
}: {
  bookingId: string;
  balance: number;
  currency: string;
  /** Set from the Payments section: after saving, open the new payment there. */
  returnBase?: string;
}) {
  const [state, action] = useFormState<BookingFormState, FormData>(recordPaymentAction, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="booking_id" value={bookingId} />
      {returnBase ? <input type="hidden" name="return_base" value={returnBase} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label={`Amount (due ${formatCurrency(balance, currency)})`} htmlFor="pay-amount" error={err('amount')}>
        <input id="pay-amount" name="amount" type="number" min={1} max={balance} step="0.01" defaultValue={balance} className="input" />
      </Field>
      <Field label="Method" htmlFor="pay-method" error={err('method')}>
        <select id="pay-method" name="method" className="input" defaultValue="cash">
          {PAYMENT_METHODS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Reference" htmlFor="pay-ref" hint="Optional">
        <input id="pay-ref" name="reference" className="input" maxLength={100} />
      </Field>
      <Submit label="Record payment" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function useLiveQuote(input: {
  hotelId?: string;
  bookingId?: string;
  checkIn: string;
  checkOut: string;
  rooms: RoomLine[];
  couponCode?: string;
  skip?: boolean;
}): QuotePreview | null {
  const [quote, setQuote] = useState<QuotePreview | null>(null);
  const key = JSON.stringify(input);
  const latest = useRef(key);

  useEffect(() => {
    latest.current = key;
    if (input.skip || (!input.hotelId && !input.bookingId) || !input.rooms.length) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await previewStaffQuote(input);
      // Ignore answers to questions that have since changed.
      if (latest.current === key) setQuote(result);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return quote;
}

function RoomLinesEditor({
  lines,
  onChange,
  roomTypes,
  error,
  hotelChosen,
}: {
  lines: RoomLine[];
  onChange: (lines: RoomLine[]) => void;
  roomTypes: BookableRoomType[];
  error?: string;
  hotelChosen: boolean;
}) {
  const update = (i: number, patch: Partial<RoomLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  if (!hotelChosen) return <p className="mt-4 text-sm text-slate-500">Choose a hotel to pick rooms.</p>;
  if (!roomTypes.length) return <p className="mt-4 text-sm text-slate-500">This hotel has no active room types.</p>;

  return (
    <div className="mt-4 space-y-3">
      {lines.map((line, i) => {
        const rt = roomTypes.find((r) => r.id === line.room_type_id);
        return (
          <div key={i} className="grid items-end gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
            <Field label="Room" htmlFor={`rt-${i}`}>
              <select id={`rt-${i}`} className="input" value={line.room_type_id} onChange={(e) => update(i, { room_type_id: e.target.value })}>
                {roomTypes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Rooms" htmlFor={`rooms-${i}`}>
              <input id={`rooms-${i}`} type="number" min={1} max={20} className="input" value={line.rooms} onChange={(e) => update(i, { rooms: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
            <Field label="Adults" htmlFor={`adults-${i}`} hint={rt ? `max ${rt.max_adults * line.rooms}` : undefined}>
              <input id={`adults-${i}`} type="number" min={1} max={40} className="input" value={line.adults} onChange={(e) => update(i, { adults: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
            <Field label="Children" htmlFor={`children-${i}`}>
              <input id={`children-${i}`} type="number" min={0} max={20} className="input" value={line.children} onChange={(e) => update(i, { children: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
            <button
              type="button"
              aria-label="Remove this room"
              title="Remove this room"
              disabled={lines.length === 1}
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {lines.length < 10 ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
          onClick={() => onChange([...lines, { room_type_id: roomTypes[0].id, rooms: 1, adults: 2, children: 0 }])}
        >
          <Plus className="h-4 w-4" /> Add another room type
        </button>
      ) : null}
    </div>
  );
}

function QuotePanel({ quote }: { quote: QuotePreview | null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
      <h2 className="text-base font-bold text-slate-900">Price</h2>
      {!quote ? (
        <p className="mt-2 text-sm text-slate-500">Choose the hotel, dates and rooms.</p>
      ) : !quote.ok ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{quote.error}</p>
      ) : (
        <dl className="mt-3 space-y-1.5 text-sm">
          {quote.breakdown.lines.map((line, i) => (
            <div key={i} className="flex justify-between gap-3 text-slate-600">
              <dt>
                {line.label}
                {line.detail ? <span className="block text-xs text-slate-400">{line.detail}</span> : null}
              </dt>
              <dd className="tabular-nums">{formatCurrency(line.amount, quote.breakdown.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(quote.breakdown.total_amount, quote.breakdown.currency)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function GuestFields({
  err,
  initial,
}: {
  err: (name: string) => string | undefined;
  initial?: { name: string; email: string; phone: string; address: string | null; special_requests: string | null };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Full name" htmlFor="guest_name" error={err('guest_name')}>
        <input id="guest_name" name="guest_name" className="input" defaultValue={initial?.name} autoComplete="off" />
      </Field>
      <Field label="Email" htmlFor="guest_email" error={err('guest_email')}>
        <input id="guest_email" name="guest_email" type="email" className="input" defaultValue={initial?.email} autoComplete="off" />
      </Field>
      <Field label="Phone" htmlFor="guest_phone" error={err('guest_phone')}>
        <input id="guest_phone" name="guest_phone" type="tel" className="input" defaultValue={initial?.phone} autoComplete="off" />
      </Field>
      <div className="sm:col-span-3">
        <Field label="Address" htmlFor="guest_address" hint="Optional">
          <input id="guest_address" name="guest_address" className="input" defaultValue={initial?.address ?? ''} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="Special requests" htmlFor="special_requests" hint="Optional">
          <textarea id="special_requests" name="special_requests" className="input min-h-20" defaultValue={initial?.special_requests ?? ''} maxLength={1000} />
        </Field>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Choice({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', checked ? 'border-blue-600 bg-blue-50 text-slate-900' : 'border-slate-200 text-slate-600')}>
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Submit({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || disabled}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
