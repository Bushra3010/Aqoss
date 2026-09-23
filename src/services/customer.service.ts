import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';

/** The 360° customer view the CRM shows (PRD §25). */
export async function getCustomerProfile(customerId: string) {
  const supabase = createAdminSupabase();

  const [profile, bookings, payments, reviews, transport] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', customerId).maybeSingle(),
    supabase
      .from('bookings')
      .select('id, reference, check_in, check_out, status, payment_status, total_amount, amount_paid, amount_refunded, created_at, hotels!inner (name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id, amount, status, provider, method, paid_at, booking_id')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, title, comment, status, created_at, hotels!inner (name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('transport_bookings')
      .select('id, route_name, seats, amount, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (bookings.data ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);

  return {
    profile: profile.data,
    bookings: rows,
    upcoming: rows.filter((b) => b.check_in >= today && !['CANCELLED', 'CHECKED_OUT'].includes(b.status)),
    previous: rows.filter((b) => b.status === 'CHECKED_OUT'),
    cancelled: rows.filter((b) => ['CANCELLED', 'REFUNDED'].includes(b.status)),
    payments: payments.data ?? [],
    reviews: reviews.data ?? [],
    transport: transport.data ?? [],
    stats: {
      totalBookings: rows.length,
      totalSpend: rows.reduce((s, b) => s + Number(b.amount_paid) - Number(b.amount_refunded), 0),
      cancellations: rows.filter((b) => b.status === 'CANCELLED').length,
    },
  };
}

/** Customer list for the CRM, with aggregate spend (PRD §25). */
export async function listCustomers(input: { search?: string; limit?: number } = {}) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, mobile, city, created_at, is_active')
    .eq('is_admin', false)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 50);

  if (input.search) {
    const term = `%${input.search}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},mobile.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const ids = (data ?? []).map((p) => p.id);
  if (!ids.length) return [];

  const { data: bookingRows } = await supabase
    .from('bookings')
    .select('customer_id, amount_paid, amount_refunded')
    .in('customer_id', ids);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const totals = new Map<string, { bookings: number; spend: number }>();
  for (const row of (bookingRows ?? []) as any[]) {
    const t = totals.get(row.customer_id) ?? { bookings: 0, spend: 0 };
    t.bookings += 1;
    t.spend += Number(row.amount_paid) - Number(row.amount_refunded);
    totals.set(row.customer_id, t);
  }

  return (data ?? []).map((p) => ({
    ...p,
    totalBookings: totals.get(p.id)?.bookings ?? 0,
    totalSpend: totals.get(p.id)?.spend ?? 0,
  }));
}
