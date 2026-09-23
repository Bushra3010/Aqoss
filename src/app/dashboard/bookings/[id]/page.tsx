import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUser } from '@/lib/auth/session';
import { getBookingDetail } from '@/services/booking.service';
import { StatusBadge } from '@/components/ui';
import { CancelBookingButton } from '@/components/booking/CancelBookingButton';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking details' };

/** Booking detail, invoice and review entry point (PRD §12). */
export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  const booking = await getBookingDetail(params.id);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const b = booking as any;

  // A customer only ever sees their own booking.
  if (!b || b.customer_id !== user!.id) notFound();

  const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
  const invoice = b.invoices?.[0];
  const address = [hotel.address_line1, hotel.city, hotel.state, hotel.postal_code]
    .filter(Boolean)
    .join(', ');

  const canCancel = ['PENDING', 'CONFIRMED'].includes(b.status);
  const canReview = b.status === 'CHECKED_OUT';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/bookings" className="text-sm text-slate-500 hover:text-slate-800">
          ← All bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="section-title">{hotel.name}</h1>
          <div className="flex gap-2">
            <StatusBadge status={b.status} />
            <StatusBadge status={b.payment_status} />
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">Booking {b.reference} · {address}</p>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Stay details</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Item label="Check-in" value={`${formatDate(b.check_in)} · from ${formatTime(hotel.check_in_time)}`} />
          <Item label="Check-out" value={`${formatDate(b.check_out)} · by ${formatTime(hotel.check_out_time)}`} />
          <Item
            label="Rooms"
            value={(b.booking_rooms ?? []).map((r: any) => `${r.rooms} × ${r.room_type_name}`).join(', ')}
          />
          <Item
            label="Guests"
            value={`${b.adults} adult${b.adults > 1 ? 's' : ''}${
              b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''
            }`}
          />
        </dl>

        {b.special_requests ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">Your request: </span>
            {b.special_requests}
          </p>
        ) : null}
      </section>

      {b.transport_bookings?.length ? (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Transport</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {b.transport_bookings.map((t: any) => (
              <li key={t.id} className="flex justify-between">
                <span className="text-slate-600">
                  {t.route_name} · {t.seats} seat{t.seats > 1 ? 's' : ''}
                </span>
                <span className="text-slate-900">{formatCurrency(Number(t.amount), b.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
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
          {Number(b.amount_refunded) > 0 ? (
            <Money label="Refunded" value={Number(b.amount_refunded)} currency={b.currency} />
          ) : null}
        </dl>

        {invoice ? (
          <p className="mt-3 text-xs text-slate-500">Invoice {invoice.invoice_number}</p>
        ) : null}
      </section>

      {canReview ? (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Write a review</h2>
          <ReviewForm bookingId={b.id} />
        </section>
      ) : null}

      {canCancel ? (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Need to cancel?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Refunds follow the property&apos;s cancellation policy.
          </p>
          <div className="mt-4">
            <CancelBookingButton bookingId={b.id} />
          </div>
        </section>
      ) : null}
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
