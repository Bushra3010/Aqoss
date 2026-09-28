import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { getPaymentAdapter } from '@/lib/payments';
import { AppError } from '@/lib/api';
import { money } from '@/lib/utils';
import { confirmBookingPayment } from '@/services/booking.service';
import { queueBookingNotifications } from '@/services/notification.service';
import { recordAudit } from '@/services/audit.service';
import type { Booking } from '@/types';

/**
 * Payments (PRD §27, §41).
 *
 * The rule the whole module is built around: a booking is confirmed by the
 * server after it has verified the gateway's signature and re-read the amount
 * from the gateway. The browser's report of "payment succeeded" is a hint to go
 * and check, never evidence.
 */

/** Step 1 — create the gateway order for a PENDING booking. */
export async function startPayment(bookingId: string) {
  const supabase = createAdminSupabase();
  const adapter = getPaymentAdapter();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, reference, hotel_id, customer_id, guest_name, guest_email, guest_phone, total_amount, currency, payment_status, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;
  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.payment_status === 'PAID') {
    throw new AppError('This booking has already been paid.', 409);
  }
  if (booking.status === 'CANCELLED') {
    throw new AppError('This booking has been cancelled.', 409);
  }

  const order = await adapter.createOrder({
    bookingId: booking.id,
    reference: booking.reference,
    amount: Number(booking.total_amount),
    currency: booking.currency,
    customer: {
      name: booking.guest_name,
      email: booking.guest_email,
      phone: booking.guest_phone,
    },
  });

  const { data: payment, error: insertError } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      hotel_id: booking.hotel_id,
      provider: adapter.name,
      provider_order_id: order.orderId,
      amount: Number(booking.total_amount),
      currency: booking.currency,
      status: 'PENDING',
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  return { payment_id: payment.id, order };
}

/**
 * Step 2 — verify what the browser reported and, if it holds up, confirm.
 *
 * The amount check is deliberate: a valid signature on a ₹1 payment must not
 * confirm a ₹11,980 booking.
 */
export async function verifyAndConfirm(input: {
  paymentId: string;
  payload: Record<string, unknown>;
}): Promise<Booking> {
  const supabase = createAdminSupabase();
  const adapter = getPaymentAdapter();

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, booking_id, amount, status, provider')
    .eq('id', input.paymentId)
    .maybeSingle();

  if (error) throw error;
  if (!payment) throw new AppError('Payment not found.', 404);

  const verification = await adapter.verifyPayment(input.payload);

  if (!verification.verified) {
    await supabase
      .from('payments')
      .update({
        status: 'FAILED',
        failure_reason: verification.failureReason ?? 'Verification failed',
        raw_response: verification.raw,
      })
      .eq('id', payment.id);

    await recordAudit({
      action: 'payment.verification_failed',
      entity: 'payments',
      entityId: payment.id,
      newValue: { reason: verification.failureReason },
    });

    throw new AppError('Payment failed. Please try again or use another method.', 402);
  }

  if (verification.amount + 0.01 < Number(payment.amount)) {
    await supabase
      .from('payments')
      .update({
        status: 'FAILED',
        failure_reason: `Amount mismatch: expected ${payment.amount}, received ${verification.amount}`,
        raw_response: verification.raw,
      })
      .eq('id', payment.id);

    throw new AppError('Payment amount did not match the booking total.', 402);
  }

  await supabase
    .from('payments')
    .update({
      provider_payment_id: verification.providerPaymentId,
      method: verification.method ?? null,
      raw_response: verification.raw,
    })
    .eq('id', payment.id);

  return confirmBookingPayment({
    bookingId: payment.booking_id,
    paymentId: payment.id,
    amount: verification.amount,
  });
}

/**
 * Refund part or all of what a booking has paid (PRD §27).
 *
 * A booking can have several payments — an online deposit, cash at the desk —
 * so the refund is spread across them, newest first, never taking more from a
 * payment than is left on it. Gateway payments are refunded through the
 * gateway; money taken by staff (`manual`) was never the gateway's to return,
 * so those parts are recorded as handed back by the hotel.
 */
export async function refundPayment(input: {
  bookingId: string;
  /** Refund only from this payment (the payment page); otherwise newest first. */
  paymentId?: string;
  amount?: number;
  reason?: string;
  actorId?: string | null;
}) {
  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, hotel_id, status, amount_paid, amount_refunded, total_amount')
    .eq('id', input.bookingId)
    .maybeSingle();
  if (!booking) throw new AppError('Booking not found.', 404);

  let paymentsQuery = supabase
    .from('payments')
    .select('id, provider, provider_payment_id, amount, status, paid_at, created_at')
    .eq('booking_id', booking.id)
    .in('status', ['PAID', 'PARTIALLY_REFUNDED']);
  if (input.paymentId) paymentsQuery = paymentsQuery.eq('id', input.paymentId);

  const [{ data: payments }, { data: earlier }] = await Promise.all([
    paymentsQuery,
    supabase.from('refunds').select('payment_id, amount').eq('booking_id', booking.id),
  ]);

  const refundedBy = new Map<string, number>();
  for (const r of earlier ?? []) refundedBy.set(r.payment_id, (refundedBy.get(r.payment_id) ?? 0) + Number(r.amount));

  // Newest money back first.
  const pool = (payments ?? [])
    .map((p) => ({ ...p, left: money(Number(p.amount) - (refundedBy.get(p.id) ?? 0)) }))
    .filter((p) => p.left > 0)
    .sort((a, b) => String(b.paid_at ?? b.created_at).localeCompare(String(a.paid_at ?? a.created_at)));

  // What can come back: the booking's net paid, and no more than is left on
  // the payment(s) being refunded from.
  const refundable = money(
    Math.min(Number(booking.amount_paid) - Number(booking.amount_refunded), pool.reduce((s, p) => s + p.left, 0)),
  );
  const amount = money(input.amount ?? refundable);
  if (!(amount > 0) || amount > refundable) {
    throw new AppError(
      refundable > 0
        ? `Refund must be more than 0 and at most ${refundable}.`
        : input.paymentId
          ? 'Nothing is left to refund on this payment.'
          : 'Nothing is left to refund on this booking.',
      422,
    );
  }

  const adapter = getPaymentAdapter();
  let refunded = 0;
  const parts: { payment_id: string; amount: number; by: 'gateway' | 'hotel' }[] = [];

  try {
    for (const payment of pool) {
      const part = money(Math.min(payment.left, amount - refunded));
      if (part <= 0) break;

      let status: 'REFUNDED' | 'PENDING' = 'REFUNDED';
      let providerRefundId: string | null = null;
      let raw: unknown = { returned_by: 'hotel' };

      if (payment.provider !== 'manual') {
        if (!payment.provider_payment_id) {
          throw new AppError('An online payment on this booking has no gateway reference to refund against.', 409);
        }
        const result = await adapter.refund({
          providerPaymentId: payment.provider_payment_id,
          amount: part,
          reason: input.reason,
        });
        status = result.status === 'REFUNDED' ? 'REFUNDED' : 'PENDING';
        providerRefundId = result.refundId;
        raw = result.raw;
      }

      await supabase.from('refunds').insert({
        payment_id: payment.id,
        booking_id: booking.id,
        amount: part,
        reason: input.reason ?? null,
        status,
        provider_refund_id: providerRefundId,
        raw_response: raw,
        processed_by: input.actorId ?? null,
        processed_at: new Date().toISOString(),
      });
      await supabase
        .from('payments')
        .update({ status: part >= payment.left ? 'REFUNDED' : 'PARTIALLY_REFUNDED' })
        .eq('id', payment.id);

      refunded = money(refunded + part);
      parts.push({ payment_id: payment.id, amount: part, by: payment.provider === 'manual' ? 'hotel' : 'gateway' });
    }
  } finally {
    // Whatever went through is recorded on the booking, even if a later part
    // failed — the money has moved.
    if (refunded > 0) {
      const totalRefunded = money(Number(booking.amount_refunded) + refunded);
      const fullyRefunded = totalRefunded >= Number(booking.amount_paid);
      await supabase
        .from('bookings')
        .update({
          amount_refunded: totalRefunded,
          payment_status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          // A refunded booking is over — unless the guest is (or was) in the room.
          ...(fullyRefunded && ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(booking.status) ? { status: 'REFUNDED' } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
    }
  }

  await queueBookingNotifications(booking.id, 'refund.processed');
  await recordAudit({
    action: 'payment.refunded',
    entity: 'bookings',
    entityId: booking.id,
    hotelId: booking.hotel_id,
    actorId: input.actorId ?? null,
    newValue: { amount: refunded, parts },
  });

  return {
    amount: refunded,
    byHotel: money(parts.filter((p) => p.by === 'hotel').reduce((s, p) => s + p.amount, 0)),
  };
}

export const MANUAL_PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer'] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

/**
 * Money taken by staff — cash or UPI at the desk, a card machine, a bank
 * transfer. Goes through the same `confirm_booking_payment` step as a gateway
 * payment, so a booking paid in full is confirmed, invoiced and notified the
 * same way; a part-payment just raises `amount_paid`.
 */
export async function recordManualPayment(input: {
  bookingId: string;
  amount: number;
  method: ManualPaymentMethod;
  reference?: string | null;
  actorId: string;
}): Promise<{ booking: Booking; paymentId: string }> {
  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, hotel_id, customer_id, status, total_amount, amount_paid, amount_refunded, currency')
    .eq('id', input.bookingId)
    .maybeSingle();
  if (!booking) throw new AppError('Booking not found.', 404);
  if (['CANCELLED', 'REFUNDED'].includes(booking.status)) {
    throw new AppError('This booking has been cancelled.', 409);
  }

  // What is still owed after anything already refunded.
  const balance = money(Number(booking.total_amount) - (Number(booking.amount_paid) - Number(booking.amount_refunded)));
  if (balance <= 0) throw new AppError('Nothing is due on this booking.', 409);
  if (!(input.amount > 0) || input.amount > balance) {
    throw new AppError(`Enter an amount up to the balance due (${balance}).`, 400);
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      hotel_id: booking.hotel_id,
      provider: 'manual',
      provider_payment_id: input.reference || null,
      method: input.method,
      amount: input.amount,
      currency: booking.currency,
      status: 'PENDING',
      raw_response: { recorded_by: input.actorId },
    })
    .select('id')
    .single();
  if (error) throw error;

  const updated = await confirmBookingPayment({ bookingId: booking.id, paymentId: payment.id, amount: input.amount });

  await recordAudit({
    action: 'payment.recorded',
    entity: 'payments',
    entityId: payment.id,
    hotelId: booking.hotel_id,
    actorId: input.actorId,
    newValue: { amount: input.amount, method: input.method, reference: input.reference ?? null },
  });

  return { booking: updated, paymentId: payment.id };
}
