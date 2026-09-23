import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking confirmed' };

/** Booking confirmation (PRD §13, §29). */
export default async function ConfirmationPage({ params }: { params: { reference: string } }) {
  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from('bookings')
    .select(
      `id, reference, guest_name, guest_email, guest_phone, check_in, check_out, nights,
       adults, children, rooms_count, status, payment_status, currency,
       room_subtotal, transport_total, discount_total, tax_total, total_amount, amount_paid,
       hotels!inner (name, phone, email, address_line1, city, state, postal_code, check_in_time, check_out_time),
       booking_rooms (room_type_name, rooms),
       transport_bookings (route_name, seats, amount),
       invoices (invoice_number, total)`,
    )
    .eq('reference', params.reference.toUpperCase())
    .maybeSingle();

  if (!booking) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const b = booking as any;
  const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
  const invoice = b.invoices?.[0];
  const address = [hotel.address_line1, hotel.city, hotel.state, hotel.postal_code].filter(Boolean).join(', ');
  const confirmed = b.status === 'CONFIRMED' || b.payment_status === 'PAID';

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="text-center">
        <span
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
            confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d={confirmed ? 'M5 13l4 4L19 7' : 'M12 8v5m0 3h.01'} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
          {confirmed ? 'Your booking is confirmed' : 'Your booking is pending payment'}
        </h1>
        <p className="mt-2 text-slate-600">
          Booking ID <span className="font-semibold text-slate-900">{b.reference}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          A confirmation has been sent to {b.guest_email}.
        </p>
      </div>

      <div className="card mt-8 divide-y divide-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="font-semibold text-slate-900">{hotel.name}</h2>
            <p className="text-sm text-slate-500">{address}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={b.status} />
            <StatusBadge status={b.payment_status} />
          </div>
        </div>

        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Item label="Check-in" value={`${formatDate(b.check_in)} · from ${formatTime(hotel.check_in_time)}`} />
          <Item label="Check-out" value={`${formatDate(b.check_out)} · by ${formatTime(hotel.check_out_time)}`} />
          <Item
            label="Rooms"
            value={(b.booking_rooms ?? []).map((r: any) => `${r.rooms} × ${r.room_type_name}`).join(', ')}
          />
          <Item
            label="Guests"
            value={`${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}`}
          />
          <Item label="Nights" value={String(b.nights)} />
          <Item label="Guest" value={`${b.guest_name} · ${b.guest_phone}`} />
        </dl>

        {b.transport_bookings?.length ? (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">Transport</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {b.transport_bookings.map((t: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{t.route_name} · {t.seats} seat{t.seats > 1 ? 's' : ''}</span>
                  <span>{formatCurrency(Number(t.amount), b.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Money label="Room charges" value={Number(b.room_subtotal)} currency={b.currency} />
            {Number(b.transport_total) > 0 ? (
              <Money label="Transport" value={Number(b.transport_total)} currency={b.currency} />
            ) : null}
            {Number(b.discount_total) > 0 ? (
              <Money label="Discount" value={-Number(b.discount_total)} currency={b.currency} />
            ) : null}
            <Money label="Taxes & fees" value={Number(b.tax_total)} currency={b.currency} />
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <dt>Total</dt>
              <dd>{formatCurrency(Number(b.total_amount), b.currency)}</dd>
            </div>
            <Money label="Paid" value={Number(b.amount_paid)} currency={b.currency} />
          </dl>

          {invoice ? (
            <p className="mt-3 text-xs text-slate-500">Invoice {invoice.invoice_number}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/bookings" className="btn-primary">View in my bookings</Link>
        <Link href="/" className="btn-outline">Back to hotel</Link>
        {hotel.phone ? (
          <a href={`tel:${hotel.phone}`} className="btn-ghost">Call the property</a>
        ) : null}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function Money({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd>{formatCurrency(value, currency)}</dd>
    </div>
  );
}
