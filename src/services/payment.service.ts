import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { getPaymentAdapter } from '@/lib/payments';
import { AppError } from '@/lib/api';
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

/** Refund, in full or in part (PRD §27). */
export async function refundPayment(input: {
  bookingId: string;
  amount?: number;
  reason?: string;
  actorId?: string | null;
}) {
  const supabase = createAdminSupabase();
  const adapter = getPaymentAdapter();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, hotel_id, amount_paid, amount_refunded, total_amount')
    .eq('id', input.bookingId)
    .maybeSingle();

  if (!booking) throw new AppError('Booking not found.', 404);

  const { data: payment } = await supabase
    .from('payments')
    .select('id, provider_payment_id, amount')
    .eq('booking_id', input.bookingId)
    .eq('status', 'PAID')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.provider_payment_id) {
    throw new AppError('No captured payment found for this booking.', 409);
  }

  const refundable = Number(booking.amount_paid) - Number(booking.amount_refunded);
  const amount = input.amount ?? refundable;

  if (amount <= 0 || amount > refundable) {
    throw new AppError(`Refund must be between 0 and ${refundable}.`, 422);
  }

  const result = await adapter.refund({
    providerPaymentId: payment.provider_payment_id,
    amount,
    reason: input.reason,
  });

  await supabase.from('refunds').insert({
    payment_id: payment.id,
    booking_id: booking.id,
    amount: result.amount,
    reason: input.reason ?? null,
    status: result.status === 'REFUNDED' ? 'REFUNDED' : 'PENDING',
    provider_refund_id: result.refundId,
    raw_response: result.raw,
    processed_by: input.actorId ?? null,
    processed_at: new Date().toISOString(),
  });

  const totalRefunded = Number(booking.amount_refunded) + result.amount;
  const fullyRefunded = totalRefunded >= Number(booking.amount_paid);

  await supabase
    .from('bookings')
    .update({
      amount_refunded: totalRefunded,
      payment_status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      status: fullyRefunded ? 'REFUNDED' : undefined,
    })
    .eq('id', booking.id);

  await supabase
    .from('payments')
    .update({ status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' })
    .eq('id', payment.id);

  await queueBookingNotifications(booking.id, 'refund.processed');
  await recordAudit({
    action: 'payment.refunded',
    entity: 'bookings',
    entityId: booking.id,
    hotelId: booking.hotel_id,
    actorId: input.actorId ?? null,
    newValue: { amount: result.amount, refund_id: result.refundId },
  });

  return result;
}
