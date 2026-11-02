import { money } from '@/lib/utils';

/**
 * What a hotel is owed for a booking, and how much of it AQOSS has paid out.
 *
 * Commission is AQOSS's percentage of the booking before tax — the tax is the
 * hotel's to remit, so it passes through whole. A booking keeps the rate it was
 * made at (`bookings.commission_percent`, migration 17); older bookings have
 * none and follow the hotel's current rate.
 *
 * A cancelled booking is settled on what was actually kept after refunds, so a
 * full refund owes the hotel nothing.
 */

export type PayoutStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'NONE';

export interface SettlementInput {
  status: string;
  total_amount: number | string;
  tax_total: number | string;
  amount_paid: number | string;
  amount_refunded: number | string;
  commission_percent: number | string | null;
}

export interface Settlement {
  /** What the booking is settled on: its total, or what a cancellation kept. */
  bookingAmount: number;
  commissionPercent: number;
  commission: number;
  payable: number;
  paidOut: number;
  outstanding: number;
  payoutStatus: PayoutStatus;
}

const CANCELLED = ['CANCELLED', 'REFUNDED'];

export function settle(
  booking: SettlementInput,
  hotelCommissionPercent: number | string | null | undefined,
  paidOut = 0,
): Settlement {
  const total = Number(booking.total_amount) || 0;
  const tax = Number(booking.tax_total) || 0;
  const commissionPercent = Number(booking.commission_percent ?? hotelCommissionPercent ?? 0);

  const bookingAmount = CANCELLED.includes(booking.status)
    ? money(Math.max(Number(booking.amount_paid) - Number(booking.amount_refunded), 0))
    : total;

  // The pre-tax part of what is being settled; for a partial refund, pro rata.
  const preTax = total > 0 ? (bookingAmount * Math.max(total - tax, 0)) / total : 0;
  const commission = money((preTax * commissionPercent) / 100);
  const payable = money(Math.max(bookingAmount - commission, 0));
  const paid = money(paidOut);
  const outstanding = money(Math.max(payable - paid, 0));

  return {
    bookingAmount,
    commissionPercent,
    commission,
    payable,
    paidOut: paid,
    outstanding,
    payoutStatus: payable <= 0 ? 'NONE' : outstanding <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
  };
}

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partly paid',
  PENDING: 'Pending',
  NONE: 'Nothing due',
};
