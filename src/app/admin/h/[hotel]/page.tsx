import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BedDouble, CreditCard, IndianRupee, Star, Users } from 'lucide-react';
import { can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import {
  getDashboardMetrics,
  getBookingTrend,
  getRecentBookings,
  getUpcomingStays,
} from '@/services/report.service';
import { listLeads } from '@/services/lead.service';
import { NoAccess, StatTile } from '@/components/admin/shared';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { RangePicker } from '@/components/admin/dashboard/RangePicker';
import { BookingOverviewChart } from '@/components/admin/dashboard/Charts';
import { RecentBookings } from '@/components/admin/dashboard/RecentBookings';
import { UpcomingStays } from '@/components/admin/dashboard/UpcomingStays';
import { formatCurrency, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Overview · Hotel admin' };

/** One hotel's dashboard: the platform dashboard, scoped to this property. */
export default async function HotelOverviewPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: { range?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  const { hotel, session } = panel;
  if (!can(session, 'dashboard.read')) return <NoAccess />;

  const scope = { hotelScope: [hotel.id] };
  const range = Number(searchParams.range ?? 7);
  const today = todayISO();
  const supabase = createAdminSupabase();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);

  const [metrics, trend, recent, upcoming, arrivals, departures, pendingReviews, leads] = await Promise.all([
    getDashboardMetrics({ ...scope, days: range }),
    getBookingTrend({ ...scope, days: range }),
    getRecentBookings({ ...scope, limit: 5 }),
    getUpcomingStays({ ...scope, limit: 4 }),
    count(
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotel.id).eq('check_in', today).in('status', ['CONFIRMED', 'CHECKED_IN']),
    ),
    count(
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotel.id).eq('check_out', today).in('status', ['CHECKED_IN', 'CONFIRMED']),
    ),
    count(
      supabase.from('reviews').select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotel.id).eq('status', 'PENDING'),
    ),
    can(session, 'leads.read') ? listLeads(hotel.id) : Promise.resolve([]),
  ]);

  const comparison = range === 7 ? 'from last week' : range === 30 ? 'from last month' : 'from last quarter';
  const bookingsBase = hotelPanelPath(hotel.slug, 'bookings');
  const newLeads = leads.filter((l) => l.status === 'NEW' && !l.stale).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Today</h2>
          <p className="text-sm text-slate-500">What needs attention at {hotel.name}.</p>
        </div>
        <RangePicker />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Arriving today" value={arrivals} href={`${bookingsBase}?filter=checkin`} />
        <StatTile label="Departing today" value={departures} href={`${bookingsBase}?filter=checkout`} />
        <StatTile label="New leads" value={newLeads} hint="Unpaid bookings to follow up" href={hotelPanelPath(hotel.slug, 'leads')} />
        <StatTile label="Reviews to approve" value={pendingReviews} href={hotelPanelPath(hotel.slug, 'reviews')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Bookings" value={String(metrics.bookings.value)} icon={BedDouble} tone="blue" metric={metrics.bookings} comparison={comparison} />
        <StatCard label="Guests" value={metrics.customers.value.toLocaleString('en-IN')} icon={Users} tone="indigo" metric={metrics.customers} comparison={comparison} />
        <StatCard label="Revenue" value={formatCurrency(metrics.revenue.value)} icon={IndianRupee} tone="emerald" metric={metrics.revenue} comparison={comparison} />
        <StatCard label="Pending payments" value={formatCurrency(metrics.pending.value)} icon={CreditCard} tone="emerald" metric={metrics.pending} comparison={comparison} />
        <StatCard
          label="Rating"
          value={metrics.rating.value ? metrics.rating.value.toFixed(1) : '—'}
          suffix={metrics.rating.value ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" /> : null}
          icon={Star}
          tone="amber"
          metric={metrics.rating}
          comparison={comparison}
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Booking Overview</h2>
            <p className="mt-0.5 text-sm text-slate-500">Bookings at {hotel.name}</p>
            <div className="mt-4">
              <BookingOverviewChart data={trend} />
            </div>
          </section>
          <RecentBookings rows={recent} bookingsHref={bookingsBase} />
        </div>
        <UpcomingStays rows={upcoming} bookingsHref={bookingsBase} />
      </div>
    </div>
  );
}
