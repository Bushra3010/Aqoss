import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bookings · AQOSS CRM' };

/** Booking management with the filters from PRD §26. */
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    payment?: string;
    hotel?: string;
    from?: string;
    to?: string;
    filter?: string;
  };
}) {
  const session = await getAdminSession();
  if (!can(session, 'bookings.read')) return <NoAccess />;

  const supabase = createAdminSupabase();

  let hotelsQuery = supabase.from('hotels').select('id, name').order('name');
  if (session!.hotelScope.length) hotelsQuery = hotelsQuery.in('id', session!.hotelScope);
  const { data: hotels } = await hotelsQuery;

  let query = supabase
    .from('bookings')
    .select(
      'id, reference, guest_name, guest_email, check_in, check_out, status, payment_status, total_amount, amount_paid, currency, created_at, hotels!inner (id, name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (session!.hotelScope.length) query = query.in('hotel_id', session!.hotelScope);
  if (searchParams.hotel) query = query.eq('hotel_id', searchParams.hotel);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.payment) query = query.eq('payment_status', searchParams.payment);
  if (searchParams.from) query = query.gte('check_in', searchParams.from);
  if (searchParams.to) query = query.lte('check_in', searchParams.to);
  if (searchParams.filter === 'checkin') query = query.eq('check_in', todayISO());
  if (searchParams.filter === 'checkout') query = query.eq('check_out', todayISO());
  if (searchParams.q) {
    const term = `%${searchParams.q}%`;
    query = query.or(`reference.ilike.${term},guest_name.ilike.${term},guest_email.ilike.${term}`);
  }

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const bookings = (data ?? []) as any[];

  return (
    <>
      <PageHeader title="Bookings" description={`${bookings.length} booking(s) shown.`} />

      <form className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input name="q" className="input" placeholder="Reference, name or email" defaultValue={searchParams.q ?? ''} />

        <select name="hotel" className="input" defaultValue={searchParams.hotel ?? ''}>
          <option value="">All hotels</option>
          {(hotels ?? []).map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        <select name="status" className="input" defaultValue={searchParams.status ?? ''}>
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select name="payment" className="input" defaultValue={searchParams.payment ?? ''}>
          <option value="">All payments</option>
          {['PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <input name="from" type="date" className="input" defaultValue={searchParams.from ?? ''} aria-label="Check-in from" />
        <div className="flex gap-2">
          <input name="to" type="date" className="input" defaultValue={searchParams.to ?? ''} aria-label="Check-in to" />
          <button type="submit" className="btn-outline shrink-0">Filter</button>
        </div>
      </form>

      <Table
        headers={[
          'Reference',
          'Guest',
          'Hotel',
          'Stay',
          'Status',
          'Payment',
          { label: 'Total', align: 'right' },
        ]}
        empty="No bookings match this filter."
      >
        {bookings.map((b) => {
          const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
          return (
            <tr key={b.id}>
              <Td>
                <Link href={`/admin/bookings/${b.id}`} className="font-medium text-slate-900 hover:underline">
                  {b.reference}
                </Link>
              </Td>
              <Td>
                {b.guest_name}
                <p className="text-xs text-slate-400">{b.guest_email}</p>
              </Td>
              <Td>{hotel?.name}</Td>
              <Td>
                {formatDate(b.check_in)} → {formatDate(b.check_out)}
              </Td>
              <Td><StatusBadge status={b.status} /></Td>
              <Td><StatusBadge status={b.payment_status} /></Td>
              <Td align="right">
                <span className="font-medium text-slate-900">
                  {formatCurrency(Number(b.total_amount), b.currency)}
                </span>
                {Number(b.amount_paid) < Number(b.total_amount) ? (
                  <p className="text-xs text-amber-600">
                    {formatCurrency(Number(b.amount_paid), b.currency)} paid
                  </p>
                ) : null}
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
