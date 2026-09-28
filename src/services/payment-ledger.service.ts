import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { money, todayISO } from '@/lib/utils';

export interface LedgerFilters {
  /** Hotels the viewer may see; empty = every hotel. */
  scope: string[];
  hotelId?: string;
  q?: string;
  status?: string;
  /** `online` = through the gateway; otherwise a desk method. */
  method?: string;
  /** Paid on or after / on or before, as YYYY-MM-DD (India time). */
  from?: string;
  to?: string;
}

const PAGE = 1000;
const IST = '+05:30';
const CAPTURED = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Filters shared by the list and the totals, so the tiles always describe
 * exactly the payments the table is drawn from. Returns null when a search
 * matches no booking at all.
 */
async function applyFilters(query: any, f: LedgerFilters): Promise<any | null> {
  const supabase = createAdminSupabase();
  if (f.scope.length) query = query.in('hotel_id', f.scope);
  if (f.hotelId) query = query.eq('hotel_id', f.hotelId);
  if (f.status) query = query.eq('status', f.status);
  if (f.method === 'online') query = query.neq('provider', 'manual');
  else if (f.method) query = query.eq('provider', 'manual').eq('method', f.method);
  if (f.from) query = query.gte('paid_at', new Date(`${f.from}T00:00:00${IST}`).toISOString());
  if (f.to) query = query.lte('paid_at', new Date(`${f.to}T23:59:59.999${IST}`).toISOString());

  const term = (f.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
  if (term) {
    let bookings = supabase
      .from('bookings')
      .select('id')
      .or(`reference.ilike.%${term}%,guest_name.ilike.%${term}%,guest_email.ilike.%${term}%`)
      .limit(500);
    if (f.scope.length) bookings = bookings.in('hotel_id', f.scope);
    const ids = ((await bookings).data ?? []).map((b: { id: string }) => b.id);
    if (!ids.length) return null;
    query = query.in('booking_id', ids);
  }
  return query;
}

/** The most recent payments matching the filters, for the table. */
export async function listPayments(f: LedgerFilters, limit = 200) {
  const base = createAdminSupabase()
    .from('payments')
    .select(
      'id, amount, currency, status, provider, provider_payment_id, method, paid_at, created_at, bookings!inner (id, reference, guest_name), hotels!inner (name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  const query = await applyFilters(base, f);
  if (!query) return { rows: [] as any[], refundedBy: new Map<string, number>() };

  const rows = ((await query).data ?? []) as any[];
  const refundedBy = new Map<string, number>();
  if (rows.length) {
    const { data } = await createAdminSupabase()
      .from('refunds')
      .select('payment_id, amount')
      .in('payment_id', rows.map((r) => r.id));
    for (const r of data ?? []) refundedBy.set(r.payment_id, money((refundedBy.get(r.payment_id) ?? 0) + Number(r.amount)));
  }
  return { rows, refundedBy };
}

/**
 * Totals over *every* payment matching the filters — read in pages, because
 * PostgREST returns at most a thousand rows a request. Outstanding is money
 * still owed on live bookings, which has no payment row until someone pays.
 */
export async function paymentTotals(f: LedgerFilters) {
  const supabase = createAdminSupabase();

  const payments: { id: string; amount: number; status: string }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const base = supabase
      .from('payments')
      .select('id, amount, status')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    const query = await applyFilters(base, f);
    if (!query) break;
    const page = ((await query).data ?? []) as any[];
    payments.push(...page);
    if (page.length < PAGE) break;
  }

  const captured = payments.filter((p) => CAPTURED.includes(p.status));
  const received = money(captured.reduce((s, p) => s + Number(p.amount), 0));

  let refunded = 0;
  const capturedIds = captured.map((p) => p.id);
  for (let i = 0; i < capturedIds.length; i += PAGE) {
    const { data } = await supabase.from('refunds').select('amount').in('payment_id', capturedIds.slice(i, i + PAGE));
    refunded += (data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  }
  refunded = money(refunded);

  // Outstanding: live bookings with a balance, same hotel / search scope.
  let outstanding = 0;
  let outstandingCount = 0;
  if (!f.status && !f.method && !f.from && !f.to) {
    for (let offset = 0; ; offset += PAGE) {
      let q = supabase
        .from('bookings')
        .select('id, total_amount, amount_paid, amount_refunded')
        .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (f.scope.length) q = q.in('hotel_id', f.scope);
      if (f.hotelId) q = q.eq('hotel_id', f.hotelId);
      const term = (f.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
      if (term) q = q.or(`reference.ilike.%${term}%,guest_name.ilike.%${term}%,guest_email.ilike.%${term}%`);
      const page = ((await q).data ?? []) as any[];
      for (const b of page) {
        const due = money(Number(b.total_amount) - (Number(b.amount_paid) - Number(b.amount_refunded)));
        if (due > 0) {
          outstanding += due;
          outstandingCount++;
        }
      }
      if (page.length < PAGE) break;
    }
  }

  return {
    received,
    refunded,
    net: money(received - refunded),
    count: payments.length,
    failed: payments.filter((p) => p.status === 'FAILED').length,
    awaiting: payments.filter((p) => p.status === 'PENDING').length,
    outstanding: money(outstanding),
    outstandingCount,
    /** Outstanding only means something without payment-level filters. */
    outstandingShown: !f.status && !f.method && !f.from && !f.to,
  };
}

export interface PaymentRefundRow {
  id: string;
  amount: number;
  reason: string | null;
  status: string;
  provider_refund_id: string | null;
  processed_at: string | null;
  created_at: string;
  /** Staff member who issued it, when known. */
  by: string | null;
}

/**
 * One payment with what its page needs: the booking it paid for, the refunds
 * taken from it, and who recorded or refunded it.
 */
export async function getPaymentDetail(paymentId: string) {
  const supabase = createAdminSupabase();

  const { data: payment } = await supabase
    .from('payments')
    .select(
      'id, booking_id, hotel_id, provider, provider_order_id, provider_payment_id, method, amount, currency, status, failure_reason, raw_response, paid_at, created_at, bookings!inner (id, reference, guest_name, guest_email, guest_phone, check_in, check_out, status, payment_status, total_amount, amount_paid, amount_refunded, currency), hotels!inner (id, name)',
    )
    .eq('id', paymentId)
    .maybeSingle();
  if (!payment) return null;

  const { data: refunds } = await supabase
    .from('refunds')
    .select('id, amount, reason, status, provider_refund_id, processed_by, processed_at, created_at')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false });

  const p = payment as any;
  const staffIds = [
    ...new Set([p.raw_response?.recorded_by, ...(refunds ?? []).map((r: any) => r.processed_by)].filter(Boolean)),
  ] as string[];
  const names = new Map<string, string>();
  if (staffIds.length) {
    const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', staffIds);
    for (const s of data ?? []) names.set(s.id, s.full_name ?? s.email);
  }

  const refundRows: PaymentRefundRow[] = ((refunds ?? []) as any[]).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    reason: r.reason,
    status: r.status,
    provider_refund_id: r.provider_refund_id,
    processed_at: r.processed_at,
    created_at: r.created_at,
    by: names.get(r.processed_by) ?? null,
  }));
  const refunded = money(refundRows.reduce((s, r) => s + r.amount, 0));

  return {
    id: p.id as string,
    booking_id: p.booking_id as string,
    hotel_id: p.hotel_id as string,
    provider: p.provider as string,
    provider_order_id: p.provider_order_id as string | null,
    provider_payment_id: p.provider_payment_id as string | null,
    method: p.method as string | null,
    currency: p.currency as string,
    status: p.status as string,
    failure_reason: p.failure_reason as string | null,
    paid_at: p.paid_at as string | null,
    created_at: p.created_at as string,
    amount: Number(p.amount),
    booking: Array.isArray(p.bookings) ? p.bookings[0] : p.bookings,
    hotel: Array.isArray(p.hotels) ? p.hotels[0] : p.hotels,
    refunds: refundRows,
    refunded,
    /** Still refundable from this payment. */
    left: ['PAID', 'PARTIALLY_REFUNDED'].includes(p.status) ? money(Number(p.amount) - refunded) : 0,
    recordedBy: names.get(p.raw_response?.recorded_by) ?? null,
  };
}

/** Live bookings that still owe money, for "Record payment". */
export async function findBookingsWithBalance(input: { scope: string[]; hotelId?: string; q?: string }) {
  let query = createAdminSupabase()
    .from('bookings')
    .select('id, reference, guest_name, guest_phone, check_in, check_out, status, total_amount, amount_paid, amount_refunded, currency, hotels!inner (name)')
    .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
    .order('check_in', { ascending: true })
    .limit(300);
  if (input.scope.length) query = query.in('hotel_id', input.scope);
  if (input.hotelId) query = query.eq('hotel_id', input.hotelId);
  const term = (input.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
  if (term) query = query.or(`reference.ilike.%${term}%,guest_name.ilike.%${term}%,guest_email.ilike.%${term}%,guest_phone.ilike.%${term}%`);

  return (((await query).data ?? []) as any[])
    .map((b) => ({
      ...b,
      hotel: Array.isArray(b.hotels) ? b.hotels[0]?.name : b.hotels?.name,
      due: money(Number(b.total_amount) - (Number(b.amount_paid) - Number(b.amount_refunded))),
    }))
    .filter((b) => b.due > 0)
    // Guests in the house or arriving first (the desk's usual case), then
    // past stays still unpaid, most recent first.
    .sort((a, b) => {
      const today = todayISO();
      const aLive = a.check_out >= today;
      const bLive = b.check_out >= today;
      if (aLive !== bLive) return aLive ? -1 : 1;
      return aLive ? a.check_in.localeCompare(b.check_in) : b.check_in.localeCompare(a.check_in);
    })
    .slice(0, 25);
}
