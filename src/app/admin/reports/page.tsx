import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import {
  getBookingTrend,
  getHotelPerformance,
  getCustomerReport,
  getDashboardStats,
} from '@/services/report.service';
import { PageHeader, Table, Td, NoAccess, StatTile } from '@/components/admin/shared';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reports · AQOSS CRM' };

/** Booking, revenue and customer reports (PRD §33). */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; days?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'reports.read')) return <NoAccess />;

  const days = Math.min(Number(searchParams.days ?? 30), 365);
  const from = searchParams.from ?? todayISO(-days);
  const to = searchParams.to ?? todayISO();

  const filters = {
    hotelScope: session!.hotelScope,
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  };

  const [stats, trend, hotels, customers] = await Promise.all([
    getDashboardStats(filters),
    getBookingTrend({ hotelScope: session!.hotelScope, days }),
    getHotelPerformance(filters),
    getCustomerReport(filters),
  ]);

  const exportQuery = new URLSearchParams({ from, to });

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${formatDate(from)} → ${formatDate(to)}`}
        action={
          <>
            <a href={`/admin/reports/export?type=bookings&${exportQuery}`} className="btn-outline">
              Bookings CSV
            </a>
            <a href={`/admin/reports/export?type=revenue&${exportQuery}`} className="btn-outline">
              Revenue CSV
            </a>
            <a href={`/admin/reports/export?type=customers&${exportQuery}`} className="btn-outline">
              Customers CSV
            </a>
          </>
        }
      />

      <form className="mb-6 flex flex-wrap gap-2">
        <input name="from" type="date" className="input max-w-[11rem]" defaultValue={from} aria-label="From" />
        <input name="to" type="date" className="input max-w-[11rem]" defaultValue={to} aria-label="To" />
        <button type="submit" className="btn-outline">Apply</button>
      </form>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <StatTile label="Bookings" value={stats.totalBookings} />
        <StatTile label="Revenue collected" value={formatCurrency(stats.revenue)} />
        <StatTile label="Cancelled" value={stats.cancelledBookings} />
        <StatTile label="Customers" value={stats.totalCustomers} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Hotel-wise performance</h2>
      <Table
        headers={[
          'Hotel',
          { label: 'Bookings', align: 'right' },
          { label: 'Cancelled', align: 'right' },
          { label: 'Revenue', align: 'right' },
        ]}
        empty="No bookings in this period."
      >
        {hotels.map((h) => (
          <tr key={h.hotel}>
            <Td><span className="font-medium text-slate-900">{h.hotel}</span></Td>
            <Td align="right">{h.bookings}</Td>
            <Td align="right">{h.cancelled}</Td>
            <Td align="right">{formatCurrency(h.revenue)}</Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Top customers</h2>
      <Table
        headers={[
          'Customer',
          'Email',
          'Type',
          { label: 'Bookings', align: 'right' },
          { label: 'Spend', align: 'right' },
        ]}
        empty="No customers in this period."
      >
        {customers.slice(0, 25).map((c) => (
          <tr key={c.email}>
            <Td><span className="font-medium text-slate-900">{c.name}</span></Td>
            <Td>{c.email}</Td>
            <Td>{c.isReturning ? 'Returning' : 'New'}</Td>
            <Td align="right">{c.bookings}</Td>
            <Td align="right">{formatCurrency(c.spend)}</Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Daily breakdown</h2>
      <Table
        headers={[
          'Date',
          { label: 'Bookings', align: 'right' },
          { label: 'Cancelled', align: 'right' },
          { label: 'Revenue', align: 'right' },
        ]}
      >
        {trend
          .filter((d) => d.bookings > 0 || d.revenue > 0)
          .reverse()
          .map((d) => (
            <tr key={d.date}>
              <Td>{formatDate(d.date)}</Td>
              <Td align="right">{d.bookings}</Td>
              <Td align="right">{d.cancelled}</Td>
              <Td align="right">{formatCurrency(d.revenue)}</Td>
            </tr>
          ))}
      </Table>
    </>
  );
}
