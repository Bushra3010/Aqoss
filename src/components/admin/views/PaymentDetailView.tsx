import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { getPaymentDetail } from '@/services/payment-ledger.service';
import { paymentMethodLabel } from '@/lib/payment-labels';
import { NoAccess, PageHeader, Table, Td } from '@/components/admin/shared';
import { RefundFromPaymentForm } from '@/components/admin/PaymentForms';
import { Alert, StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/**
 * One payment: how and when it came in, the booking it paid for, and every
 * refund taken from it. `hotelId` pins it to a hotel panel — a payment of any
 * other hotel is a 404 there.
 */
export async function PaymentDetailView({
  session,
  paymentId,
  hotelId,
  paymentsHref,
  bookingHref,
  notice,
}: {
  session: AdminSession;
  paymentId: string;
  hotelId?: string;
  paymentsHref: string;
  bookingHref: (bookingId: string) => string;
  notice?: { recorded?: string };
}) {
  const p = await getPaymentDetail(paymentId);
  if (!p || (hotelId && p.hotel_id !== hotelId)) notFound();
  if (!canAccessHotel(session, p.hotel_id)) return <NoAccess />;

  const b = p.booking;
  const atHotel = p.provider === 'manual';
  const owed = Math.round((Number(b.total_amount) - (Number(b.amount_paid) - Number(b.amount_refunded))) * 100) / 100;

  return (
    <>
      <PageHeader
        title={formatCurrency(p.amount, p.currency)}
        description={`${paymentMethodLabel(p)} · ${b.reference} · ${p.hotel?.name ?? ''}`}
        action={
          <>
            <StatusBadge status={p.status} />
            <Link href={paymentsHref} className="btn-ghost">All payments</Link>
          </>
        }
      />

      {notice?.recorded ? (
        <div className="mb-6">
          <Alert tone="success">Payment recorded against {b.reference}.</Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Item label="Amount" value={formatCurrency(p.amount, p.currency)} />
              <Item label="Method" value={paymentMethodLabel(p)} />
              <Item label={atHotel ? 'Taken' : 'Paid'} value={when(p.paid_at)} />
              <Item label="Status" value={String(p.status).replace(/_/g, ' ').toLowerCase()} />
              {p.provider_payment_id ? <Item label={atHotel ? 'Reference' : 'Gateway payment ID'} value={p.provider_payment_id} /> : null}
              {p.provider_order_id ? <Item label="Gateway order ID" value={p.provider_order_id} /> : null}
              {atHotel ? <Item label="Recorded by" value={p.recordedBy ?? '—'} /> : null}
              {p.refunded > 0 ? <Item label="Refunded from it" value={formatCurrency(p.refunded, p.currency)} /> : null}
              {p.failure_reason ? <Item label="Failure reason" value={p.failure_reason} /> : null}
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Refunds from this payment</h2>
            <Table headers={['When', 'Reason', 'By', 'Status', { label: 'Amount', align: 'right' as const }]} empty="No refunds from this payment.">
              {p.refunds.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap">{when(r.processed_at ?? r.created_at)}</Td>
                  <Td>{r.reason ?? '—'}</Td>
                  <Td>
                    {r.by ?? '—'}
                    <p className="text-xs text-slate-400">{atHotel ? 'Handed back at the hotel' : r.provider_refund_id ?? 'Via gateway'}</p>
                  </Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td align="right">{formatCurrency(r.amount, p.currency)}</Td>
                </tr>
              ))}
            </Table>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Booking</h2>
            <p className="mt-3 font-semibold text-slate-900">{b.reference}</p>
            <p className="text-sm text-slate-600">{b.guest_name}</p>
            <p className="text-xs text-slate-400">{b.guest_email} · {b.guest_phone}</p>
            <p className="mt-2 text-sm text-slate-600">{formatDate(b.check_in)} → {formatDate(b.check_out)}</p>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={b.status} />
              <StatusBadge status={b.payment_status} />
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
              <Money label="Booking total" value={Number(b.total_amount)} currency={b.currency} />
              <Money label="Paid" value={Number(b.amount_paid)} currency={b.currency} />
              {Number(b.amount_refunded) > 0 ? <Money label="Refunded" value={-Number(b.amount_refunded)} currency={b.currency} /> : null}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <dt>{owed > 0 ? 'Still owed' : 'Balance'}</dt>
                <dd>{formatCurrency(Math.max(owed, 0), b.currency)}</dd>
              </div>
            </dl>
            <Link href={bookingHref(b.id)} className="btn-outline mt-4 w-full justify-center">Open booking</Link>
          </section>

          {can(session, 'payments.refund') && p.left > 0 ? (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Refund from this payment</h2>
              <RefundFromPaymentForm paymentId={p.id} left={p.left} currency={p.currency} atHotel={atHotel} />
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
      <dd className="mt-0.5 break-words font-medium text-slate-900">{value}</dd>
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
