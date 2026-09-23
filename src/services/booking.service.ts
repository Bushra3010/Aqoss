import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { quoteBooking } from '@/services/pricing.service';
import { queueBookingNotifications } from '@/services/notification.service';
import { createInvoice } from '@/services/invoice.service';
import { recordAudit } from '@/services/audit.service';
import type { Booking, CreateBookingRequest, PriceBreakdown } from '@/types';

/**
 * Booking creation (PRD §13, §41).
 *
 * The API route validates the request; this service re-prices it from the
 * database and then hands the whole thing to `create_booking_transaction`,
 * which does the final availability check, consumes inventory and writes the
 * booking inside a single Postgres transaction. If anything fails — including
 * another customer taking the last room a millisecond earlier — the entire
 * transaction rolls back and nothing is half-written.
 */
export async function createBooking(
  request: CreateBookingRequest,
  customerId: string | null,
): Promise<{ booking: Booking; breakdown: PriceBreakdown }> {
  const supabase = createAdminSupabase();

  // 1. Re-price server-side. Never trust totals sent by the browser.
  const { breakdown, availability, transportLines } = await quoteBooking({
    hotelId: request.hotelId,
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    rooms: request.rooms,
    transport: request.transport,
    couponCode: request.couponCode,
    customerId,
  });

  // 2. Attach the per-line detail the transaction stores as a snapshot.
  const roomPayload = request.rooms.map((room) => {
    const match = availability.find((a) => a.room_type_id === room.room_type_id)!;
    const perRoom = match.nightly_rates.reduce((s, n) => s + n.price, 0);
    const subtotal = Math.round(perRoom * room.rooms * 100) / 100;
    const share = breakdown.room_subtotal > 0 ? subtotal / breakdown.room_subtotal : 0;

    return {
      room_type_id: room.room_type_id,
      rooms: room.rooms,
      adults: room.adults,
      children: room.children,
      nightly_rates: match.nightly_rates,
      subtotal,
      discount: Math.round(breakdown.discount_total * share * 100) / 100,
      tax: Math.round(breakdown.tax_total * share * 100) / 100,
      total: Math.round((subtotal - breakdown.discount_total * share + breakdown.tax_total * share) * 100) / 100,
    };
  });

  const transportPayload = transportLines.map((t) => ({
    slot_id: t.slot_id,
    seats: t.seats,
    amount: t.amount,
  }));

  // 3. The atomic step.
  const { data, error } = await supabase.rpc('create_booking_transaction', {
    p_hotel_id: request.hotelId,
    p_website_id: request.websiteId ?? null,
    p_customer_id: customerId,
    p_check_in: request.checkIn,
    p_check_out: request.checkOut,
    p_rooms: roomPayload,
    p_guest: {
      name: request.guest.name,
      email: request.guest.email,
      phone: request.guest.phone,
      address: request.guest.address ?? null,
      special_requests: request.guest.special_requests ?? null,
      adults: request.guest.adults,
      children: request.guest.children,
    },
    p_pricing: breakdown,
    p_guests: request.guests ?? [],
    p_transport: transportPayload,
    p_hold_ids: request.holdIds ?? [],
    p_coupon_code: request.couponCode ?? null,
    p_source: request.source ?? 'WEBSITE',
  });

  if (error) throw error;

  const booking = data as Booking;

  await recordAudit({
    action: 'booking.created',
    entity: 'bookings',
    entityId: booking.id,
    hotelId: booking.hotel_id,
    actorId: customerId,
    newValue: { reference: booking.reference, total: booking.total_amount },
  });

  return { booking, breakdown };
}

/**
 * Called once the gateway response has been verified (PRD §27).
 * Confirms the booking, issues the invoice and queues the notifications.
 */
export async function confirmBookingPayment(input: {
  bookingId: string;
  paymentId: string;
  amount: number;
}): Promise<Booking> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc('confirm_booking_payment', {
    p_booking_id: input.bookingId,
    p_payment_id: input.paymentId,
    p_amount: input.amount,
  });

  if (error) throw error;
  const booking = data as Booking;

  if (booking.status === 'CONFIRMED') {
    await createInvoice(booking.id);
    await queueBookingNotifications(booking.id, 'booking.confirmed');
    await queueBookingNotifications(booking.id, 'payment.received');
  }

  await recordAudit({
    action: 'payment.confirmed',
    entity: 'bookings',
    entityId: booking.id,
    hotelId: booking.hotel_id,
    newValue: { payment_status: booking.payment_status, amount: input.amount },
  });

  return booking;
}

/** Cancel a booking and return its inventory to the pool (PRD §26). */
export async function cancelBooking(input: {
  bookingId: string;
  reason?: string;
  actorId?: string | null;
}): Promise<Booking> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: input.bookingId,
    p_reason: input.reason ?? null,
  });

  if (error) throw error;
  const booking = data as Booking;

  await queueBookingNotifications(booking.id, 'booking.cancelled');
  await recordAudit({
    action: 'booking.cancelled',
    entity: 'bookings',
    entityId: booking.id,
    hotelId: booking.hotel_id,
    actorId: input.actorId ?? null,
    newValue: { reason: input.reason ?? null },
  });

  return booking;
}

/** Full booking detail, including rooms, guests, payments and invoice. */
export async function getBookingDetail(bookingId: string) {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `*,
       hotels!inner (id, name, slug, phone, email, address_line1, city, state, postal_code,
                     check_in_time, check_out_time, currency),
       booking_rooms (*),
       booking_guests (*),
       payments (id, amount, status, provider, provider_payment_id, method, paid_at),
       invoices (id, invoice_number, total, pdf_url, issued_at),
       transport_bookings (id, route_name, seats, amount, status),
       booking_status_history (from_status, to_status, note, created_at)`,
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Look a booking up by its customer-facing reference (AQH-2026-000001). */
export async function getBookingByReference(reference: string, email?: string) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('bookings')
    .select('id, reference, guest_email')
    .eq('reference', reference.toUpperCase());

  if (email) query = query.eq('guest_email', email.toLowerCase());

  const { data } = await query.maybeSingle();
  if (!data) throw new AppError('We could not find that booking.', 404);

  return getBookingDetail(data.id);
}

/** Check-in / check-out (PRD §26). */
export async function setBookingStatus(input: {
  bookingId: string;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'CONFIRMED';
  actorId?: string | null;
}) {
  const supabase = createAdminSupabase();

  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === 'CHECKED_IN') patch.checked_in_at = new Date().toISOString();
  if (input.status === 'CHECKED_OUT') patch.checked_out_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', input.bookingId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AppError('Booking not found.', 404);

  if (input.status === 'CHECKED_OUT') {
    // Thank-you + review request (PRD §20).
    await queueBookingNotifications(data.id, 'booking.completed');
  }

  await recordAudit({
    action: `booking.${input.status.toLowerCase()}`,
    entity: 'bookings',
    entityId: data.id,
    hotelId: data.hotel_id,
    actorId: input.actorId ?? null,
    newValue: { status: input.status },
  });

  return data as Booking;
}
