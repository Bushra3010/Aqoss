'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, canAccessHotel } from '@/lib/auth/session';
import { AppError, toApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { refundPayment } from '@/services/payment.service';
import { findBookingsWithBalance, getPaymentDetail } from '@/services/payment-ledger.service';
import { recordPayout } from '@/services/settlement.service';

export type PaymentFormState = { error?: string; success?: string };

/** Refund part or all of one payment, from its own page. */
export async function refundFromPaymentAction(_prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  try {
    const session = await requirePermission('payments.refund');
    const payment = await getPaymentDetail(String(formData.get('payment_id') ?? ''));
    if (!payment) throw new AppError('Payment not found.', 404);
    if (!canAccessHotel(session, payment.hotel_id)) throw new AppError('This payment is outside your assigned hotels.', 403);

    const amount = Number(formData.get('amount'));
    if (!(amount > 0)) return { error: 'Enter the amount to refund.' };
    const reason = String(formData.get('reason') ?? '').trim().slice(0, 300) || undefined;

    const result = await refundPayment({
      bookingId: payment.booking_id,
      paymentId: payment.id,
      amount,
      reason,
      actorId: session.userId,
    });
    revalidatePath('/admin', 'layout');
    return {
      success:
        result.byHotel > 0
          ? `Refund of ${formatCurrency(result.amount)} recorded. This money was taken at the hotel — hand it back to the guest.`
          : `Refund of ${formatCurrency(result.amount)} sent back through the payment gateway.`,
    };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}

/** Bookings that still owe money, for picking one to record a payment against. */
export async function searchBookingsForPayment(input: { q?: string; hotelId?: string }) {
  try {
    const session = await requirePermission('payments.write');
    if (input.hotelId && !canAccessHotel(session, input.hotelId)) return [];
    return await findBookingsWithBalance({ scope: session.hotelScope, hotelId: input.hotelId, q: input.q });
  } catch {
    return [];
  }
}

/** Record that AQOSS paid a hotel its share of a booking. */
export async function recordPayoutAction(_prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  try {
    const session = await requirePermission('payouts.write');
    const bookingId = String(formData.get('booking_id') ?? '');
    const hotelId = String(formData.get('hotel_id') ?? '');
    if (!canAccessHotel(session, hotelId)) throw new AppError('This booking is outside your assigned hotels.', 403);

    const paidOn = String(formData.get('paid_on') ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: 'Enter the date it was paid.' };

    const result = await recordPayout({
      bookingId,
      hotelId,
      amount: Number(formData.get('amount')),
      paidOn,
      reference: String(formData.get('reference') ?? '').trim().slice(0, 120) || null,
      notes: String(formData.get('notes') ?? '').trim().slice(0, 300) || null,
      actorId: session.userId,
    });
    revalidatePath('/admin', 'layout');
    return {
      success:
        result.outstanding > 0
          ? `Payout of ${formatCurrency(result.amount)} recorded. ${formatCurrency(result.outstanding)} is still due.`
          : `Payout of ${formatCurrency(result.amount)} recorded. This booking is fully paid out.`,
    };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}
