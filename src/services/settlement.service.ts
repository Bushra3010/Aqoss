import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { formatCurrency, money } from '@/lib/utils';
import { settle, type Settlement } from '@/lib/settlement';
import { recordAudit } from '@/services/audit.service';

/**
 * Settlements: what AQOSS owes each hotel for its bookings, and the payouts
 * made against them (migration 17).
 *
 * A booking counts once it is confirmed — unpaid PENDING bookings are leads,
 * not money. Cancelled bookings count only when something was kept after
 * refunds, or something has already been paid out on them.
 */

const PAGE = 1000;
const SETTLED_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REFUNDED'];

export interface SettlementRow extends Settlement {
  id: string;
  reference: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string;
  currency: string;
  total_amount: number;
}

export interface SettlementSummary {
  bookings: number;
  payable: number;
  paid: number;
  pending: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Every settled booking of one hotel whose check-in falls in [from, to]. */
export async function listSettlements(input: {
  hotelId: string;
  from?: string;
  to?: string;
}): Promise<{ rows: SettlementRow[]; summary: SettlementSummary }> {
  const supabase = createAdminSupabase();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('commission_percent')
    .eq('id', input.hotelId)
    .maybeSingle();

  const bookings: any[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from('bookings')
      .select(
        'id, reference, guest_name, check_in, check_out, status, payment_status, currency, total_amount, tax_total, amount_paid, amount_refunded, commission_percent',
      )
      .eq('hotel_id', input.hotelId)
      .in('status', SETTLED_STATUSES)
      .order('check_in', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (input.from) q = q.gte('check_in', input.from);
    if (input.to) q = q.lte('check_in', input.to);
    const page = ((await q).data ?? []) as any[];
    bookings.push(...page);
    if (page.length < PAGE) break;
  }

  const paidOut = new Map<string, number>();
  const ids = bookings.map((b) => b.id);
  for (let i = 0; i < ids.length; i += PAGE) {
    const { data } = await supabase
      .from('property_payouts')
      .select('booking_id, amount')
      .in('booking_id', ids.slice(i, i + PAGE));
    for (const p of (data ?? []) as any[]) {
      paidOut.set(p.booking_id, (paidOut.get(p.booking_id) ?? 0) + Number(p.amount));
    }
  }

  const rows: SettlementRow[] = bookings
    .map((b) => ({
      id: b.id,
      reference: b.reference,
      guest_name: b.guest_name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      payment_status: b.payment_status,
      currency: b.currency,
      total_amount: Number(b.total_amount),
      ...settle(b, hotel?.commission_percent, paidOut.get(b.id) ?? 0),
    }))
    .filter((r) => r.payable > 0 || r.paidOut > 0);

  const summary: SettlementSummary = {
    bookings: rows.length,
    payable: money(rows.reduce((s, r) => s + r.payable, 0)),
    paid: money(rows.reduce((s, r) => s + r.paidOut, 0)),
    pending: money(rows.reduce((s, r) => s + r.outstanding, 0)),
  };

  return { rows, summary };
}

/** Payouts recorded against one booking, newest first. */
export async function listBookingPayouts(bookingId: string) {
  const { data } = await createAdminSupabase()
    .from('property_payouts')
    .select('id, amount, paid_on, reference, notes, created_at')
    .eq('booking_id', bookingId)
    .order('paid_on', { ascending: false });
  return ((data ?? []) as any[]).map((p) => ({ ...p, amount: Number(p.amount) }));
}

/**
 * Record money AQOSS has paid a hotel for a booking. Never more than is still
 * owed: the outstanding amount is worked out here, not taken from the form.
 */
export async function recordPayout(input: {
  bookingId: string;
  /** The hotel the caller was cleared for; the booking must belong to it. */
  hotelId: string;
  amount: number;
  paidOn: string;
  reference?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, hotel_id, reference, status, total_amount, tax_total, amount_paid, amount_refunded, commission_percent, hotels (commission_percent)')
    .eq('id', input.bookingId)
    .maybeSingle();
  if (!booking || booking.hotel_id !== input.hotelId) throw new AppError('Booking not found.', 404);
  if (!SETTLED_STATUSES.includes(booking.status)) {
    throw new AppError('Only confirmed bookings can be paid out.', 409);
  }

  const already = (await listBookingPayouts(booking.id)).reduce((s, p) => s + p.amount, 0);
  const hotel = Array.isArray(booking.hotels) ? booking.hotels[0] : booking.hotels;
  const { outstanding } = settle(booking, (hotel as any)?.commission_percent, already);

  if (!(input.amount > 0)) throw new AppError('Enter the amount paid.', 422);
  if (outstanding <= 0) throw new AppError('Nothing is owed on this booking.', 422);
  // The CRM shows whole rupees, so paying "₹1,735" against ₹1,734.50 owed
  // means "the rest" — settle exactly what is owed, never more.
  if (input.amount >= outstanding + 1) {
    throw new AppError(`Only ${formatCurrency(outstanding)} is still owed on this booking.`, 422);
  }
  const amount = money(Math.min(input.amount, outstanding));

  const { data, error } = await supabase
    .from('property_payouts')
    .insert({
      hotel_id: booking.hotel_id,
      booking_id: booking.id,
      amount,
      paid_on: input.paidOn,
      reference: input.reference || null,
      notes: input.notes || null,
      created_by: input.actorId,
    })
    .select('id')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'payout.recorded',
    entity: 'property_payouts',
    entityId: data.id,
    hotelId: booking.hotel_id,
    actorId: input.actorId,
    newValue: { booking: booking.reference, amount, paid_on: input.paidOn, reference: input.reference ?? null },
  });

  return { amount, outstanding: money(outstanding - amount) };
}
