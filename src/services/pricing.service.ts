import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { money } from '@/lib/utils';
import { searchAvailability } from '@/services/availability.service';
import type {
  AvailabilityResult,
  BookingRoomRequest,
  CouponValidation,
  PriceBreakdown,
  PriceLine,
  TransportSelection,
} from '@/types';

/**
 * The single source of truth for what a booking costs (PRD §15).
 *
 * Every figure here is derived from the database — nightly rates from
 * `search_availability`, transport from `transport_slots`, discounts from
 * `validate_coupon`. Nothing the browser sends is trusted, which is why the
 * checkout page and the booking API both call this same function.
 *
 *   Room + services + transport + tax - discount - coupon = total
 */
export async function quoteBooking(input: {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  rooms: BookingRoomRequest[];
  transport?: TransportSelection[];
  couponCode?: string | null;
  customerId?: string | null;
}): Promise<{
  breakdown: PriceBreakdown;
  availability: AvailabilityResult[];
  transportLines: { slot_id: string; label: string; seats: number; amount: number }[];
  coupon: CouponValidation | null;
}> {
  const supabase = createAdminSupabase();

  const totalRoomsRequested = input.rooms.reduce((s, r) => s + r.rooms, 0);
  const totalAdults = input.rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = input.rooms.reduce((s, r) => s + r.children, 0);

  const availability = await searchAvailability({
    hotelId: input.hotelId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: Math.max(totalAdults, 1),
    children: totalChildren,
    rooms: Math.max(totalRoomsRequested, 1),
  });

  const lines: PriceLine[] = [];
  let roomSubtotal = 0;
  let taxTotal = 0;
  let taxPercent = 0;
  let nights = 0;
  let currency = 'INR';

  // ---- rooms -------------------------------------------------------------
  for (const requested of input.rooms) {
    const match = availability.find((a) => a.room_type_id === requested.room_type_id);

    if (!match) {
      throw new AppError('Selected dates are unavailable for this room.', 409);
    }
    if (!match.is_available || match.available_rooms < requested.rooms) {
      throw new AppError(
        match.available_rooms > 0
          ? `Only ${match.available_rooms} ${match.name} left for these dates.`
          : `${match.name} is no longer available.`,
        409,
      );
    }

    // `match` was priced for the whole party; re-scale to this line's rooms.
    const perRoom = match.nightly_rates.reduce((s, n) => s + n.price, 0);
    const lineSubtotal = money(perRoom * requested.rooms);

    roomSubtotal += lineSubtotal;
    nights = match.nights;
    taxPercent = Math.max(taxPercent, Number(match.tax_percent));

    lines.push({
      label: match.name,
      detail: `${requested.rooms} room${requested.rooms > 1 ? 's' : ''} × ${match.nights} night${
        match.nights > 1 ? 's' : ''
      }`,
      amount: lineSubtotal,
      kind: 'room',
    });
  }

  // ---- transport ---------------------------------------------------------
  const transportLines: { slot_id: string; label: string; seats: number; amount: number }[] = [];
  let transportTotal = 0;

  if (input.transport?.length) {
    const { data: slots, error } = await supabase
      .from('transport_slots')
      .select(
        `id, hotel_id, depart_date, depart_time, seat_capacity, booked_seats, price_override, status,
         transport_routes!inner (id, name, base_price, price_per_seat)`,
      )
      .in('id', input.transport.map((t) => t.slot_id))
      .eq('hotel_id', input.hotelId);

    if (error) throw error;

    for (const selection of input.transport) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const slot = (slots ?? []).find((s: any) => s.id === selection.slot_id) as any;

      if (!slot || slot.status !== 'ACTIVE') {
        throw new AppError('Selected transport is unavailable.', 409);
      }
      const free = slot.seat_capacity - slot.booked_seats;
      if (free < selection.seats) {
        throw new AppError(
          free > 0 ? `Only ${free} seat(s) left on this route.` : 'That transport service is full.',
          409,
        );
      }

      const route = Array.isArray(slot.transport_routes)
        ? slot.transport_routes[0]
        : slot.transport_routes;

      const amount = money(
        slot.price_override != null
          ? Number(slot.price_override) * selection.seats
          : Number(route.base_price) + Number(route.price_per_seat) * selection.seats,
      );

      transportTotal += amount;
      transportLines.push({
        slot_id: slot.id,
        label: route.name,
        seats: selection.seats,
        amount,
      });
      lines.push({
        label: route.name,
        detail: `${selection.seats} seat${selection.seats > 1 ? 's' : ''} · ${slot.depart_date}`,
        amount,
        kind: 'transport',
      });
    }
  }

  // ---- hotel tax rate (fallback when no room line set one) ----------------
  if (!taxPercent) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('tax_percent, currency')
      .eq('id', input.hotelId)
      .maybeSingle();
    taxPercent = Number(hotel?.tax_percent ?? 0);
    currency = hotel?.currency ?? 'INR';
  } else {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('currency')
      .eq('id', input.hotelId)
      .maybeSingle();
    currency = hotel?.currency ?? 'INR';
  }

  // ---- coupon ------------------------------------------------------------
  // Applied to the room subtotal only: transport is a third-party cost.
  let couponDiscount = 0;
  let coupon: CouponValidation | null = null;

  if (input.couponCode) {
    coupon = await validateCoupon({
      code: input.couponCode,
      hotelId: input.hotelId,
      amount: roomSubtotal,
      customerId: input.customerId ?? null,
      roomTypeIds: input.rooms.map((r) => r.room_type_id),
    });

    if (!coupon.valid) throw new AppError(coupon.message, 422, 'INVALID_COUPON');

    couponDiscount = money(coupon.discount);
    lines.push({
      label: `Coupon ${input.couponCode.toUpperCase()}`,
      amount: -couponDiscount,
      kind: 'discount',
    });
  }

  // ---- tax & total -------------------------------------------------------
  const taxableAmount = money(Math.max(roomSubtotal - couponDiscount, 0));
  taxTotal = money((taxableAmount * taxPercent) / 100);

  lines.push({
    label: `Taxes & fees (${taxPercent}%)`,
    amount: taxTotal,
    kind: 'tax',
  });

  const totalAmount = money(taxableAmount + transportTotal + taxTotal);

  const breakdown: PriceBreakdown = {
    currency,
    nights,
    room_subtotal: money(roomSubtotal),
    extra_services_total: 0,
    transport_total: money(transportTotal),
    discount_total: couponDiscount,
    coupon_code: input.couponCode ?? null,
    coupon_discount: couponDiscount,
    taxable_amount: taxableAmount,
    tax_percent: taxPercent,
    tax_total: taxTotal,
    total_amount: totalAmount,
    lines,
  };

  return { breakdown, availability, transportLines, coupon };
}

/** Thin wrapper over the `validate_coupon` database function (PRD §30). */
export async function validateCoupon(input: {
  code: string;
  hotelId: string;
  amount: number;
  customerId?: string | null;
  roomTypeIds?: string[];
}): Promise<CouponValidation> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: input.code,
    p_hotel_id: input.hotelId,
    p_amount: input.amount,
    p_customer_id: input.customerId ?? null,
    p_room_type_ids: input.roomTypeIds ?? [],
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { valid: false, discount: 0, message: 'Invalid coupon', coupon_id: null };

  return {
    valid: Boolean(row.valid),
    discount: Number(row.discount ?? 0),
    message: row.message ?? '',
    coupon_id: row.coupon_id ?? null,
  };
}
