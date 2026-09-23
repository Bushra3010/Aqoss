import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { getCustomerProfile } from '@/services/customer.service';
import { PageHeader, StatTile, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Customer · AQOSS CRM' };

/** Full customer history (PRD §25). */
export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'customers.read')) return <NoAccess />;

  const data = await getCustomerProfile(params.id);
  if (!data.profile) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const p = data.profile as any;

  return (
    <>
      <PageHeader
        title={p.full_name ?? 'Unnamed guest'}
        description={`${p.email ?? ''}${p.mobile ? ` · ${p.mobile}` : ''} · joined ${formatDate(new Date(p.created_at))}`}
        action={<Link href="/admin/customers" className="btn-ghost">Back</Link>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Total bookings" value={data.stats.totalBookings} />
        <StatTile label="Total spend" value={formatCurrency(data.stats.totalSpend)} />
        <StatTile label="Upcoming" value={data.upcoming.length} />
        <StatTile label="Cancellations" value={data.stats.cancellations} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Booking history</h2>
      <Table
        headers={['Reference', 'Hotel', 'Stay', 'Status', { label: 'Total', align: 'right' }]}
        empty="This customer has not booked yet."
      >
        {data.bookings.map((b: any) => {
          const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
          return (
            <tr key={b.id}>
              <Td>
                <Link href={`/admin/bookings/${b.id}`} className="font-medium text-slate-900 hover:underline">
                  {b.reference}
                </Link>
              </Td>
              <Td>{hotel?.name}</Td>
              <Td>{formatDate(b.check_in)} → {formatDate(b.check_out)}</Td>
              <Td><StatusBadge status={b.status} /></Td>
              <Td align="right">{formatCurrency(Number(b.total_amount))}</Td>
            </tr>
          );
        })}
      </Table>

      {data.reviews.length ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Reviews</h2>
          <Table headers={['Hotel', 'Rating', 'Review', 'Status']}>
            {data.reviews.map((r: any) => {
              const hotel = Array.isArray(r.hotels) ? r.hotels[0] : r.hotels;
              return (
                <tr key={r.id}>
                  <Td>{hotel?.name}</Td>
                  <Td>{r.rating}/5</Td>
                  <Td className="max-w-md truncate">{r.title ?? r.comment ?? '—'}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              );
            })}
          </Table>
        </>
      ) : null}
    </>
  );
}
