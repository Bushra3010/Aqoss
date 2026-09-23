import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { todayISO } from '@/lib/utils';

/**
 * Dashboard widgets and reports (PRD §32, §33).
 *
 * Counts use `head: true` so Postgres returns the count without shipping rows.
 */

export interface DashboardFilters {
  hotelId?: string | null;
  /** Restrict to these hotels (an admin's scope). Empty = all hotels. */
  hotelScope?: string[];
  from?: string;
  to?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function scoped(query: any, filters: DashboardFilters, column = 'hotel_id') {
  if (filters.hotelId) return query.eq(column, filters.hotelId);
  if (filters.hotelScope?.length) return query.in(column, filters.hotelScope);
  return query;
}

export async function getDashboardStats(filters: DashboardFilters = {}) {
  const supabase = createAdminSupabase();
  const today = todayISO();

  const count = async (table: string, build?: (q: any) => any) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    q = scoped(q, filters);
    if (build) q = build(q);
    const { count: n } = await q;
    return n ?? 0;
  };

  const [
    totalHotels,
    totalWebsites,
    totalCustomers,
    totalBookings,
    todaysBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    cancelledBookings,
    pendingPayments,
    transportBookings,
  ] = await Promise.all([
    (async () => {
      let q = supabase.from('hotels').select('*', { count: 'exact', head: true });
      if (filters.hotelScope?.length) q = q.in('id', filters.hotelScope);
      if (filters.hotelId) q = q.eq('id', filters.hotelId);
      const { count: n } = await q;
      return n ?? 0;
    })(),
    count('websites'),
    (async () => {
      const { count: n } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', false);
      return n ?? 0;
    })(),
    count('bookings'),
    count('bookings', (q) => q.gte('created_at', `${today}T00:00:00`)),
    count('bookings', (q) => q.eq('check_in', today).in('status', ['CONFIRMED', 'PENDING'])),
    count('bookings', (q) => q.eq('check_out', today).eq('status', 'CHECKED_IN')),
    count('bookings', (q) => q.eq('status', 'CANCELLED')),
    count('bookings', (q) => q.eq('payment_status', 'PENDING').neq('status', 'CANCELLED')),
    count('transport_bookings'),
  ]);

  // Revenue: only money actually collected, minus refunds.
  let revenueQuery = supabase
    .from('bookings')
    .select('amount_paid, amount_refunded')
    .neq('status', 'CANCELLED');
  revenueQuery = scoped(revenueQuery, filters);
  if (filters.from) revenueQuery = revenueQuery.gte('created_at', filters.from);
  if (filters.to) revenueQuery = revenueQuery.lte('created_at', filters.to);

  const { data: revenueRows } = await revenueQuery;
  const revenue = (revenueRows ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.amount_paid) - Number(r.amount_refunded),
    0,
  );

  // Rooms free tonight, across the scope.
  let invQuery = supabase
    .from('room_inventory')
    .select('total_rooms, blocked_rooms, booked_rooms')
    .eq('stay_date', today);
  invQuery = scoped(invQuery, filters);
  const { data: invRows } = await invQuery;
  const availableRooms = (invRows ?? []).reduce(
    (sum: number, r: any) => sum + (r.total_rooms - r.blocked_rooms - r.booked_rooms),
    0,
  );

  return {
    totalHotels,
    totalWebsites,
    totalCustomers,
    totalBookings,
    todaysBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    cancelledBookings,
    revenue,
    pendingPayments,
    availableRooms,
    transportBookings,
  };
}

/** Bookings and revenue per day, for the dashboard charts (PRD §32). */
export async function getBookingTrend(filters: DashboardFilters & { days?: number } = {}) {
  const supabase = createAdminSupabase();
  const days = filters.days ?? 30;
  const from = todayISO(-days);

  let query = supabase
    .from('bookings')
    .select('created_at, total_amount, amount_paid, status')
    .gte('created_at', `${from}T00:00:00`)
    .order('created_at');
  query = scoped(query, filters);

  const { data } = await query;

  const buckets = new Map<string, { date: string; bookings: number; revenue: number; cancelled: number }>();
  for (let i = 0; i <= days; i++) {
    const date = todayISO(-days + i);
    buckets.set(date, { date, bookings: 0, revenue: 0, cancelled: 0 });
  }

  for (const row of (data ?? []) as any[]) {
    const date = String(row.created_at).slice(0, 10);
    const bucket = buckets.get(date);
    if (!bucket) continue;
    bucket.bookings += 1;
    bucket.revenue += Number(row.amount_paid);
    if (row.status === 'CANCELLED') bucket.cancelled += 1;
  }

  return [...buckets.values()];
}

/** Bookings and revenue grouped by hotel (PRD §32, §33). */
export async function getHotelPerformance(filters: DashboardFilters = {}) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('bookings')
    .select('hotel_id, total_amount, amount_paid, status, hotels!inner (name)');
  query = scoped(query, filters);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);

  const { data } = await query;

  const byHotel = new Map<string, { hotel: string; bookings: number; revenue: number; cancelled: number }>();

  for (const row of (data ?? []) as any[]) {
    const hotel = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
    const key = row.hotel_id;
    const entry = byHotel.get(key) ?? { hotel: hotel?.name ?? 'Unknown', bookings: 0, revenue: 0, cancelled: 0 };
    entry.bookings += 1;
    entry.revenue += Number(row.amount_paid);
    if (row.status === 'CANCELLED') entry.cancelled += 1;
    byHotel.set(key, entry);
  }

  return [...byHotel.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Room occupancy over a window: booked nights / available nights (PRD §32). */
export async function getOccupancy(filters: DashboardFilters & { days?: number } = {}) {
  const supabase = createAdminSupabase();
  const days = filters.days ?? 30;

  let query = supabase
    .from('room_inventory')
    .select('stay_date, total_rooms, blocked_rooms, booked_rooms')
    .gte('stay_date', todayISO())
    .lt('stay_date', todayISO(days))
    .order('stay_date');
  query = scoped(query, filters);

  const { data } = await query;

  const byDate = new Map<string, { date: string; total: number; booked: number }>();
  for (const row of (data ?? []) as any[]) {
    const entry = byDate.get(row.stay_date) ?? { date: row.stay_date, total: 0, booked: 0 };
    entry.total += row.total_rooms - row.blocked_rooms;
    entry.booked += row.booked_rooms;
    byDate.set(row.stay_date, entry);
  }

  return [...byDate.values()].map((d) => ({
    ...d,
    occupancy: d.total > 0 ? Math.round((d.booked / d.total) * 100) : 0,
  }));
}

/** Customer report rows (PRD §33). */
export async function getCustomerReport(filters: DashboardFilters = {}) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('bookings')
    .select('customer_id, guest_name, guest_email, amount_paid, created_at, status');
  query = scoped(query, filters);

  const { data } = await query;

  const byCustomer = new Map<
    string,
    { name: string; email: string; bookings: number; spend: number; firstBooking: string; lastBooking: string }
  >();

  for (const row of (data ?? []) as any[]) {
    const key = row.customer_id ?? row.guest_email;
    const entry = byCustomer.get(key) ?? {
      name: row.guest_name,
      email: row.guest_email,
      bookings: 0,
      spend: 0,
      firstBooking: row.created_at,
      lastBooking: row.created_at,
    };
    entry.bookings += 1;
    entry.spend += Number(row.amount_paid);
    if (row.created_at < entry.firstBooking) entry.firstBooking = row.created_at;
    if (row.created_at > entry.lastBooking) entry.lastBooking = row.created_at;
    byCustomer.set(key, entry);
  }

  return [...byCustomer.values()]
    .map((c) => ({ ...c, isReturning: c.bookings > 1 }))
    .sort((a, b) => b.spend - a.spend);
}

/** Flatten any report to CSV for the export buttons (PRD §33). */
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Dashboard metrics with period-over-period movement (PRD §32)
// ---------------------------------------------------------------------------

export interface MetricDelta {
  value: number;
  /** Percentage change against the preceding window of the same length. */
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat';
}

function delta(current: number, previous: number): MetricDelta {
  if (previous === 0) {
    return {
      value: current,
      changePercent: current === 0 ? 0 : null,
      direction: current > 0 ? 'up' : 'flat',
    };
  }

  const change = ((current - previous) / previous) * 100;

  // A swing this large means the baseline was nearly empty, not that something
  // moved 900%. Report no comparison rather than a number nobody can act on.
  if (Math.abs(change) > 300) {
    return { value: current, changePercent: null, direction: change > 0 ? 'up' : 'down' };
  }

  return {
    value: current,
    changePercent: Math.round(change * 10) / 10,
    direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'flat',
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/**
 * The five headline tiles, each compared against the preceding window so the
 * "up 18% from last week" line reflects real movement rather than decoration.
 */
export async function getDashboardMetrics(
  filters: DashboardFilters & { days?: number } = {},
) {
  const supabase = createAdminSupabase();
  const days = filters.days ?? 7;
  const windowStart = daysAgo(days);
  const previousStart = daysAgo(days * 2);

  let bookingsQuery = supabase
    .from('bookings')
    .select('created_at, status, payment_status, total_amount, amount_paid, amount_refunded, customer_id, guest_email');
  bookingsQuery = scoped(bookingsQuery, filters);
  const { data: bookingRows } = await bookingsQuery;

  const rows = (bookingRows ?? []) as any[];
  const inWindow = (r: any) => r.created_at >= windowStart;
  const inPrevious = (r: any) => r.created_at >= previousStart && r.created_at < windowStart;

  // Each tile shows a running total; the arrow is momentum over the selected
  // window against the window before it.

  // -- bookings ----------------------------------------------------------
  const bookings = {
    ...delta(rows.filter(inWindow).length, rows.filter(inPrevious).length),
    value: rows.length,
  };

  // -- revenue collected --------------------------------------------------
  const collected = (subset: any[]) =>
    subset.reduce((s, r) => s + Number(r.amount_paid) - Number(r.amount_refunded), 0);

  const revenue = {
    ...delta(collected(rows.filter(inWindow)), collected(rows.filter(inPrevious))),
    value: collected(rows),
  };

  // -- pending payments ---------------------------------------------------
  // The tile shows everything currently outstanding; the comparison is
  // like-for-like — what this window booked but has not paid, against the
  // window before it.
  const outstanding = (subset: any[]) =>
    subset
      .filter((r) => r.payment_status === 'PENDING' && r.status !== 'CANCELLED')
      .reduce((s, r) => s + (Number(r.total_amount) - Number(r.amount_paid)), 0);

  const pending = {
    ...delta(outstanding(rows.filter(inWindow)), outstanding(rows.filter(inPrevious))),
    value: outstanding(rows),
  };

  // -- customers ----------------------------------------------------------
  // Total registered, moving with new sign-ups window over window.
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('is_admin', false);

  const profiles = (profileRows ?? []) as any[];

  const customers = {
    ...delta(profiles.filter(inWindow).length, profiles.filter(inPrevious).length),
    value: profiles.length,
  };

  // -- review score -------------------------------------------------------
  let reviewsQuery = supabase.from('reviews').select('rating, created_at').eq('status', 'APPROVED');
  reviewsQuery = scoped(reviewsQuery, filters);
  const { data: reviewRows } = await reviewsQuery;
  const reviews = (reviewRows ?? []) as any[];

  const average = (subset: any[]) =>
    subset.length
      ? Math.round((subset.reduce((s, r) => s + Number(r.rating), 0) / subset.length) * 10) / 10
      : 0;

  // An average only moves meaningfully when both windows actually have reviews;
  // otherwise "-100%" would just mean "nobody reviewed this week".
  const reviewsNow = reviews.filter(inWindow);
  const reviewsBefore = reviews.filter(inPrevious);

  const rating =
    reviewsNow.length && reviewsBefore.length
      ? { ...delta(average(reviewsNow), average(reviewsBefore)), value: average(reviews) }
      : { value: average(reviews), changePercent: null, direction: 'flat' as const };

  return { bookings, customers, revenue, pending, rating, reviewCount: reviews.length };
}

/** The most recent bookings, for the dashboard table. */
export async function getRecentBookings(filters: DashboardFilters & { limit?: number } = {}) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('bookings')
    .select(
      'id, reference, guest_name, guest_email, check_in, status, total_amount, currency, created_at, hotels!inner (name), booking_rooms (room_type_name)',
    )
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 5);
  query = scoped(query, filters);

  const { data } = await query;

  return ((data ?? []) as any[]).map((b) => {
    const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
    return {
      id: b.id,
      reference: b.reference,
      guest: b.guest_name,
      email: b.guest_email,
      hotel: hotel?.name ?? '—',
      roomType: b.booking_rooms?.[0]?.room_type_name ?? '—',
      checkIn: b.check_in,
      status: b.status as string,
      amount: Number(b.total_amount),
      currency: b.currency,
    };
  });
}

/** Stays arriving next, for the dashboard side panel. */
export async function getUpcomingStays(filters: DashboardFilters & { limit?: number } = {}) {
  const supabase = createAdminSupabase();
  const today = todayISO();

  let query = supabase
    .from('bookings')
    .select(
      'id, guest_name, check_in, check_out, status, hotels!inner (name, id, hotel_images (url, is_cover))',
    )
    .gte('check_in', today)
    .in('status', ['CONFIRMED', 'PENDING'])
    .order('check_in')
    .limit(filters.limit ?? 4);
  query = scoped(query, filters);

  const { data } = await query;

  return ((data ?? []) as any[]).map((b) => {
    const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
    const cover =
      hotel?.hotel_images?.find((i: any) => i.is_cover)?.url ?? hotel?.hotel_images?.[0]?.url ?? null;

    return {
      id: b.id,
      guest: b.guest_name,
      hotel: hotel?.name ?? '—',
      checkIn: b.check_in,
      checkOut: b.check_out,
      status: b.status as string,
      image: cover,
      arrivingToday: b.check_in === today,
    };
  });
}
