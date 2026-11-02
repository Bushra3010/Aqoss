import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { PayoutBadge } from '@/components/admin/LinkTabs';
import { RecordPayoutForm } from '@/components/admin/PaymentForms';
import { listBookingPayouts } from '@/services/settlement.service';
import { settle } from '@/lib/settlement';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Record payout · Hotel admin' };

/** What this booking owes the hotel, the payouts so far, and a form for the next. */
export default async function RecordPayoutPage({ params }: { params: { hotel: string; booking: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'payouts.write')) return <NoAccess />;

  const { hotel } = panel;
  const { data: b } = await createAdminSupabase()
    .from('bookings')
    .select('id, hotel_id, reference, guest_name, check_in, check_out, status, currency, total_amount, tax_total, amount_paid, amount_refunded, commission_percent, hotels (commission_percent)')
    .eq('id', params.booking)
    .maybeSingle();
  // A booking opened through a panel URL must belong to that hotel.
  if (!b || b.hotel_id !== hotel.id) notFound();

  const payouts = await listBookingPayouts(b.id);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const h = (Array.isArray(b.hotels) ? b.hotels[0] : b.hotels) as any;
  const s = settle(b, h?.commission_percent, payouts.reduce((sum, p) => sum + p.amount, 0));
  const paymentsHref = hotelPanelPath(hotel.slug, 'payments');

  const row = (label: string, value: string, strong = false) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'font-bold text-slate-900' : 'text-slate-900'}>{value}</dd>
    </div>
  );

  return (
    <>
      <PageHeader
        title={`Payout for ${b.reference}`}
        description={`${b.guest_name} · ${formatDate(b.check_in)} → ${formatDate(b.check_out)}`}
        action={<Link href={paymentsHref} className="btn-outline">Back to payments</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">Settlement</h2>
              <PayoutBadge status={s.payoutStatus} />
            </div>
            <dl className="divide-y divide-slate-100">
              {row('Booking amount', formatCurrency(s.bookingAmount, b.currency))}
              {row(`AQOSS commission (${s.commissionPercent}% before tax)`, `−${formatCurrency(s.commission, b.currency)}`)}
              {row('Payable to property', formatCurrency(s.payable, b.currency), true)}
              {row('Paid so far', formatCurrency(s.paidOut, b.currency))}
              {row('Still due', formatCurrency(s.outstanding, b.currency), true)}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-base font-bold text-slate-900">Payouts</h2>
            {payouts.length ? (
              <ul className="divide-y divide-slate-100">
                {payouts.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="font-medium text-slate-900">{formatDate(p.paid_on)}</span>
                      {p.reference ? <span className="text-slate-500"> · UTR {p.reference}</span> : null}
                      {p.notes ? <span className="block text-xs text-slate-400">{p.notes}</span> : null}
                    </span>
                    <span className="font-medium tabular-nums text-slate-900">{formatCurrency(p.amount, b.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nothing paid out on this booking yet.</p>
            )}
          </section>
        </div>

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">Record a payout</h2>
          {s.outstanding > 0 ? (
            <RecordPayoutForm bookingId={b.id} hotelId={hotel.id} outstanding={s.outstanding} currency={b.currency} />
          ) : (
            <p className="text-sm text-slate-500">Nothing is due on this booking.</p>
          )}
        </section>
      </div>
    </>
  );
}
