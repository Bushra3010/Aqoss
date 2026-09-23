import Link from 'next/link';
import type { Metadata } from 'next';
import { BedDouble, CreditCard, IndianRupee, Plus, Star, Users } from 'lucide-react';
import { getAdminSession, can } from '@/lib/auth/session';
import {
  getDashboardMetrics,
  getBookingTrend,
  getRecentBookings,
  getUpcomingStays,
} from '@/services/report.service';
import { NoAccess } from '@/components/admin/shared';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { RangePicker } from '@/components/admin/dashboard/RangePicker';
import { BookingOverviewChart, RevenueOverviewChart } from '@/components/admin/dashboard/Charts';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';
import { RecentBookings } from '@/components/admin/dashboard/RecentBookings';
import { UpcomingStays } from '@/components/admin/dashboard/UpcomingStays';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard · AQOSS CRM' };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** CRM dashboard (PRD §32). */
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { range?: string; bookings?: string; revenue?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'dashboard.read')) return <NoAccess />;

  const scope = { hotelScope: session!.hotelScope };
  const range = Number(searchParams.range ?? 7);
  const bookingRange = Number(searchParams.bookings ?? range);
  const revenueRange = Number(searchParams.revenue ?? range);

  const [metrics, bookingTrend, revenueTrend, recent, upcoming] = await Promise.all([
    getDashboardMetrics({ ...scope, days: range }),
    getBookingTrend({ ...scope, days: bookingRange }),
    getBookingTrend({ ...scope, days: revenueRange }),
    getRecentBookings({ ...scope, limit: 5 }),
    getUpcomingStays({ ...scope, limit: 4 }),
  ]);

  const firstName = (session!.fullName ?? 'there').split(' ')[0];
  const comparison = range === 7 ? 'from last week' : range === 30 ? 'from last month' : 'from last quarter';

  const now = new Date();
  const today =
    `${now.toLocaleDateString('en-IN', { weekday: 'long' })}, ` +
    `${now.getDate()} ${now.toLocaleDateString('en-IN', { month: 'long' })} ${now.getFullYear()}`;

  return (
    <div className="space-y-5">
      {/* ---- Header --------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-slate-900">
            {greeting()}, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {session!.hotelScope.length
              ? `Here's what's happening across your ${session!.hotelScope.length} assigned propert${session!.hotelScope.length > 1 ? 'ies' : 'y'}.`
              : "Here's what's happening with your hotel business today."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RangePicker />
          {can(session, 'bookings.write') ? (
            <Link
              href="/admin/bookings"
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          ) : null}
        </div>
      </div>

      {/* ---- Stat tiles ------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Bookings"
          value={String(metrics.bookings.value)}
          icon={BedDouble}
          tone="blue"
          metric={metrics.bookings}
          comparison={comparison}
        />
        <StatCard
          label="Total Customers"
          value={metrics.customers.value.toLocaleString('en-IN')}
          icon={Users}
          tone="indigo"
          metric={metrics.customers}
          comparison={comparison}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(metrics.revenue.value)}
          icon={IndianRupee}
          tone="emerald"
          metric={metrics.revenue}
          comparison={comparison}
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrency(metrics.pending.value)}
          icon={CreditCard}
          tone="emerald"
          metric={metrics.pending}
          comparison={comparison}
        />
        <StatCard
          label="Total Reviews"
          value={metrics.rating.value ? metrics.rating.value.toFixed(1) : '—'}
          suffix={
            metrics.rating.value ? (
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            ) : null
          }
          icon={Star}
          tone="amber"
          metric={metrics.rating}
          comparison={comparison}
        />
      </div>

      {/* ---- Charts + side panels -------------------------------------- */}
      {/*
       * The side rail needs ~480px before the Quick Action labels fit, and the
       * bookings table needs ~700px. Both only hold above 1536px, so below that
       * the rail drops underneath at full width instead of squeezing either.
       */}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Booking Overview</h2>
                <p className="mt-0.5 text-sm text-slate-500">Total bookings across all hotels</p>
              </div>
              <RangePicker param="bookings" size="sm" />
            </div>
            <div className="mt-4">
              <BookingOverviewChart data={bookingTrend} />
            </div>
          </section>

          <RecentBookings rows={recent} />

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Revenue Overview</h2>
                <p className="mt-0.5 text-sm text-slate-500">Total revenue from bookings</p>
              </div>
              <RangePicker param="revenue" size="sm" />
            </div>
            <div className="mt-4">
              <RevenueOverviewChart data={revenueTrend} />
            </div>
          </section>
        </div>

        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-1">
          <QuickActions permissions={session!.permissions} />
          <UpcomingStays rows={upcoming} />
        </div>
      </div>
    </div>
  );
}
