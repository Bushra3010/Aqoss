import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { env } from '@/lib/env';
import type { AvailabilityResult, AvailabilitySearch, BookingHold } from '@/types';

/**
 * Availability is answered by the database (PRD §8, §40).
 *
 * The client never decides what is bookable; it only renders what
 * `search_availability` returns, and the booking transaction re-checks the same
 * numbers under a row lock before anything is written.
 */
export async function searchAvailability(
  search: AvailabilitySearch,
): Promise<AvailabilityResult[]> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc('search_availability', {
    p_hotel_id: search.hotelId,
    p_check_in: search.checkIn,
    p_check_out: search.checkOut,
    p_adults: search.adults,
    p_children: search.children,
    p_rooms: search.rooms,
  });

  if (error) throw error;

  return ((data ?? []) as AvailabilityResult[]).map((row) => ({
    ...row,
    base_price: Number(row.base_price),
    room_subtotal: Number(row.room_subtotal),
    tax_percent: Number(row.tax_percent),
    tax_amount: Number(row.tax_amount),
    total_price: Number(row.total_price),
    available_rooms: Number(row.available_rooms),
    nightly_rates: (row.nightly_rates ?? []).map((n) => ({
      date: n.date,
      price: Number(n.price),
    })),
  }));
}

/** Find one room type in a search result, or explain why it cannot be booked. */
export async function requireAvailableRoom(
  search: AvailabilitySearch,
  roomTypeId: string,
  roomsWanted: number,
): Promise<AvailabilityResult> {
  const results = await searchAvailability(search);
  const match = results.find((r) => r.room_type_id === roomTypeId);

  if (!match) {
    throw new AppError('Selected dates are unavailable for this room.', 409);
  }
  if (!match.is_available || match.available_rooms < roomsWanted) {
    throw new AppError(
      match.available_rooms > 0
        ? `Only ${match.available_rooms} room(s) left for these dates.`
        : 'Room no longer available.',
      409,
    );
  }
  return match;
}

/**
 * Place a soft hold while the customer completes payment (PRD §10).
 * Holds expire on their own, so an abandoned checkout releases the room.
 */
export async function createHold(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  sessionId: string;
}): Promise<BookingHold> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc('create_booking_hold', {
    p_room_type_id: input.roomTypeId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_rooms: input.rooms,
    p_session_id: input.sessionId,
    p_minutes: env.bookingHoldMinutes,
  });

  if (error) throw error;
  return data as BookingHold;
}

export async function releaseHold(holdId: string): Promise<void> {
  const supabase = createAdminSupabase();
  const { error } = await supabase.rpc('release_booking_hold', { p_hold_id: holdId });
  if (error) throw error;
}

/**
 * Admin calendar view: allocation vs. bookings per night (PRD §9).
 */
export async function getInventoryCalendar(
  hotelId: string,
  from: string,
  to: string,
) {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from('room_inventory')
    .select('room_type_id, stay_date, total_rooms, blocked_rooms, booked_rooms, is_closed')
    .eq('hotel_id', hotelId)
    .gte('stay_date', from)
    .lt('stay_date', to)
    .order('stay_date');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    available: row.total_rooms - row.blocked_rooms - row.booked_rooms,
  }));
}

/** Create or extend the sellable window for a room type (PRD §9). */
export async function ensureInventory(input: {
  roomTypeId: string;
  from: string;
  to: string;
  totalRooms?: number;
}) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc('ensure_room_inventory', {
    p_room_type_id: input.roomTypeId,
    p_from: input.from,
    p_to: input.to,
    p_total_rooms: input.totalRooms ?? null,
  });
  if (error) throw error;
  return data as number;
}
