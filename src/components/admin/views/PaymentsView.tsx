import Link from 'next/link';
import type { AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td, StatTile } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

/** Payment ledger (PRD §27), optionally for one hotel. */
export async function PaymentsView({
  session,
  searchParams,
  hotelId,
  bookingHref,
}: {
  session: AdminSession;
  searchParams: { status?: string };
  hotelId?: string;
  bookingHref: (bookingId: string) => string;
}) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('payments')
    .select(
      'id, amount, currency, status, provider, provider_payment_id, method, paid_at, created_at, bookings!inner (id, reference, guest_name), hotels!inner (name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (session.hotelScope.length) query = query.in('hotel_id', session.hotelScope);
  if (hotelId) query = query.eq('hotel_id', hotelId);
  if (searchParams.status) query = query.eq('status', searchParams.status);

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const payments = (data ?? []) as any[];

  const collected = payments
    .filter((p) => p.status === 'PAID')
    .reduce((s, p) => s + Number(p.amount), 0);
  const failed = payments.filter((p) => p.status === 'FAILED').length;
  const pending = payments.filter((p) => p.status === 'PENDING').length;

  return (
    <>
      <PageHeader title="Payments" description="Every gateway transaction, verified server-side." />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile label="Collected (shown)" value={formatCurrency(collected)} />
        <StatTile label="Pending" value={pending} />
        <StatTile label="Failed" value={failed} />
      </div>

      <form className="mb-4 flex gap-2">
        <select name="status" className="input max-w-[12rem]" defaultValue={searchParams.status ?? ''}>
          <option value="">All statuses</option>
          {['PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button type="submit" className="btn-outline">Filter</button>
      </form>

      <Table
        headers={['Booking', ...(hotelId ? [] : ['Hotel']), 'Gateway', 'Status', 'Paid at', { label: 'Amount', align: 'right' }]}
        empty="No payments recorded."
      >
        {payments.map((p) => {
          const booking = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
          const hotel = Array.isArray(p.hotels) ? p.hotels[0] : p.hotels;
          return (
            <tr key={p.id}>
              <Td>
                <Link href={bookingHref(booking?.id)} className="font-medium text-slate-900 hover:underline">
                  {booking?.reference}
                </Link>
                <p className="text-xs text-slate-400">{booking?.guest_name}</p>
              </Td>
              {hotelId ? null : <Td>{hotel?.name}</Td>}
              <Td>
                {p.provider}
                {p.provider_payment_id ? (
                  <p className="text-xs text-slate-400">{p.provider_payment_id}</p>
                ) : null}
              </Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td>{p.paid_at ? formatDate(new Date(p.paid_at)) : '—'}</Td>
              <Td align="right">{formatCurrency(Number(p.amount), p.currency)}</Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
