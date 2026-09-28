import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { getBookingDetail } from '@/services/booking.service';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { Alert, StatusBadge } from '@/components/ui';
import { RecordPaymentForm } from '@/components/admin/BookingForms';
import { paymentMethodLabel } from '@/lib/payment-labels';
import { BookingActions } from '@/components/admin/BookingActions';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

/**
 * Booking detail with the staff actions from PRD §26.
 *
 * `hotelId`, when given, is the hotel panel the page is opened from: a booking
 * belonging to any other hotel is a 404 there, even for a super admin, so a
 * panel never shows another property's data.
 */
export async function BookingDetailView({
  session,
  bookingId,
  hotelId,
  backHref,
  notice,
}: {
  session: AdminSession;
  bookingId: string;
  hotelId?: string;
  backHref: string;
  /** Messages after a create, change or payment (from the URL). */
  notice?: { created?: string; changed?: string; coupon_dropped?: string; payment?: string };
}) {
  const booking = await getBookingDetail(bookingId);
  if (!booking) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const b = booking as any;
  if (hotelId && b.hotel_id !== hotelId) notFound();
  if (!canAccessHotel(session, b.hotel_id)) return <NoAccess />;

  const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
  // Owed after anything already refunded.
  const balance = Math.round((Number(b.total_amount) - (Number(b.amount_paid) - Number(b.amount_refunded))) * 100) / 100;
  const invoice = b.invoices?.[0];

  return (
    <>
      <PageHeader
        title={b.reference}
        description={`${hotel?.name} · booked ${formatDate(new Date(b.created_at))}`}
        action={
          <>
            <StatusBadge status={b.status} />
            <StatusBadge status={b.payment_status} />
            {can(session, 'bookings.write') && ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) ? (
              <Link href={`${backHref}/${b.id}/edit`} className="btn-outline">Edit booking</Link>
            ) : null}
            <Link href={backHref} className="btn-ghost">Back</Link>
          </>
        }
      />

      {notice?.created || notice?.changed || notice?.payment === 'failed' ? (
        <div className="mb-6 space-y-3">
          {notice.created ? <Alert tone="success">Booking {b.reference} created.</Alert> : null}
          {notice.changed ? (
            <Alert tone="success">
              Booking changed and re-priced.
              {notice.coupon_dropped ? ` Coupon ${notice.coupon_dropped} no longer applied and was removed.` : ''}
            </Alert>
          ) : null}
          {notice.payment === 'failed' ? (
            <Alert>The booking was saved, but the payment could not be recorded. Record it below.</Alert>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Stay</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Item label="Check-in" value={`${formatDate(b.check_in)} · ${formatTime(hotel.check_in_time)}`} />
              <Item label="Check-out" value={`${formatDate(b.check_out)} · ${formatTime(hotel.check_out_time)}`} />
              <Item label="Nights" value={String(b.nights)} />
              <Item
                label="Guests"
                value={`${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}`}
              />
              <Item
                label="Rooms"
                value={(b.booking_rooms ?? []).map((r: any) => `${r.rooms} × ${r.room_type_name}`).join(', ')}
              />
              <Item label="Source" value={b.source} />
            </dl>

            {b.special_requests ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Guest request: </span>
                {b.special_requests}
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Guest</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Item label="Name" value={b.guest_name} />
              <Item label="Email" value={b.guest_email} />
              <Item label="Phone" value={b.guest_phone} />
              {b.guest_address ? <Item label="Address" value={b.guest_address} /> : null}
            </dl>
            {b.customer_id && can(session, 'customers.read') ? (
              <Link
                href={`/admin/customers/${b.customer_id}`}
                className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                View full customer history →
              </Link>
            ) : null}
          </section>

          {b.transport_bookings?.length ? (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900">Transport</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {b.transport_bookings.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span className="text-slate-600">{t.route_name} · {t.seats} seat{t.seats > 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={t.status} />
                      <span className="text-slate-900">{formatCurrency(Number(t.amount), b.currency)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Status history</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(b.booking_status_history ?? [])
                .slice()
                .sort((a: any, z: any) => (a.created_at < z.created_at ? 1 : -1))
                .map((h: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-slate-600">
                    <span>
                      {h.from_status ? `${h.from_status} → ` : ''}
                      <span className="font-medium text-slate-900">{h.to_status}</span>
                    </span>
                    <time dateTime={h.created_at}>{new Date(h.created_at).toLocaleString('en-IN')}</time>
                  </li>
                ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Money label="Rooms" value={Number(b.room_subtotal)} currency={b.currency} />
              {Number(b.transport_total) > 0 ? (
                <Money label="Transport" value={Number(b.transport_total)} currency={b.currency} />
              ) : null}
              {Number(b.discount_total) > 0 ? (
                <Money label={`Discount${b.coupon_code ? ` (${b.coupon_code})` : ''}`} value={-Number(b.discount_total)} currency={b.currency} />
              ) : null}
              <Money label="Tax" value={Number(b.tax_total)} currency={b.currency} />
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatCurrency(Number(b.total_amount), b.currency)}</dd>
              </div>
              <Money label="Paid" value={Number(b.amount_paid)} currency={b.currency} />
              {Number(b.amount_refunded) > 0 ? (
                <Money label="Refunded" value={Number(b.amount_refunded)} currency={b.currency} />
              ) : null}
            </dl>

            {b.payments?.length ? (
              <ul className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
                {b.payments.map((p: any) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>
                      {paymentMethodLabel(p)} · {String(p.status).replace(/_/g, ' ').toLowerCase()}
                      {p.provider_payment_id ? ` · ${p.provider_payment_id}` : ''}
                    </span>
                    <span className="tabular-nums">{formatCurrency(Number(p.amount), b.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {invoice ? (
              <p className="mt-3 text-xs text-slate-500">Invoice {invoice.invoice_number}</p>
            ) : null}
          </section>

          <BookingActions
            bookingId={b.id}
            status={b.status}
            paymentStatus={b.payment_status}
            refundable={Number(b.amount_paid) - Number(b.amount_refunded)}
            currency={b.currency}
            permissions={{
              checkin: can(session, 'bookings.checkin'),
              cancel: can(session, 'bookings.cancel'),
              refund: can(session, 'payments.refund'),
            }}
          />

          {can(session, 'payments.write') && balance > 0 && !['CANCELLED', 'REFUNDED'].includes(b.status) ? (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Record a payment</h2>
              <RecordPaymentForm bookingId={b.id} balance={balance} currency={b.currency} />
            </section>
          ) : null}
        </aside>
      </div>
    </>
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
