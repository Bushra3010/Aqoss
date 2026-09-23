/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory rows are untyped by design; see src/lib/demo/README */
/**
 * Demo implementations of the database functions.
 *
 * These mirror the PL/pgSQL in `supabase/migrations/20260101000008_booking_engine.sql`
 * closely enough that the services behave identically — same inputs, same
 * outputs, same error codes, so `toApiError` translates them the same way.
 *
 * What they cannot mirror is the part that matters most in production: real
 * transactions, row locks and the oversell CHECK constraint. Node runs one
 * request at a time per process here, which hides the race rather than solving
 * it. The SQL remains the production path.
 */

import { randomUUID } from 'node:crypto';
import type { Row, Tables } from './dataset';
import { getStore } from './store';

/** Shaped like a Postgres error so the API layer treats it as customer-safe. */
class PgError extends Error {
  constructor(message: string, readonly code: string = 'P0001') {
    super(message);
  }
}

const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function eachNight(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  const end = new Date(`${checkOut}T00:00:00`);
  for (const d = new Date(`${checkIn}T00:00:00`); d < end; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------

export function createRpc(tables: Tables) {
  // Shared with every other module instance, same reason as the tables.
  const counters = getStore().counters;

  // ---- helpers ----------------------------------------------------------

  const find = (table: string, predicate: (r: Row) => boolean) =>
    (tables[table] ?? []).find(predicate);

  const filter = (table: string, predicate: (r: Row) => boolean) =>
    (tables[table] ?? []).filter(predicate);

  function nightlyRate(roomTypeId: string, date: string): number {
    const rt = find('room_types', (r) => r.id === roomTypeId);
    if (!rt) return 0;
    const override = find('room_prices', (p) => p.room_type_id === roomTypeId && p.stay_date === date);
    const price = override ? Number(override.price) : Number(rt.base_price);
    const discount = override?.discount_percent ?? rt.discount_percent ?? 0;
    return money(price * (1 - Number(discount) / 100));
  }

  function releaseExpiredHolds(): number {
    const nowIso = new Date().toISOString();
    let n = 0;
    for (const hold of tables.booking_holds ?? []) {
      if (!hold.released_at && hold.expires_at < nowIso) {
        hold.released_at = nowIso;
        n++;
      }
    }
    return n;
  }

  /** Rooms held by *other* live checkouts on a given night. */
  function heldOn(roomTypeId: string, date: string, exclude: string[] = []): number {
    const nowIso = new Date().toISOString();
    return filter(
      'booking_holds',
      (h) =>
        h.room_type_id === roomTypeId &&
        !h.released_at &&
        h.expires_at > nowIso &&
        h.check_in <= date &&
        h.check_out > date &&
        !exclude.includes(h.id),
    ).reduce((sum, h) => sum + Number(h.rooms), 0);
  }

  /** Smallest number of rooms free across every night of the stay. */
  function freeAcross(
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
    excludeHolds: string[] = [],
  ): { free: number; allOnSale: boolean } {
    const nights = eachNight(checkIn, checkOut);
    let free = Number.POSITIVE_INFINITY;
    let allOnSale = true;

    for (const date of nights) {
      const inv = find(
        'room_inventory',
        (r) => r.room_type_id === roomTypeId && r.stay_date === date,
      );

      if (!inv || inv.is_closed) {
        allOnSale = false;
        free = 0;
        break;
      }

      const available =
        Number(inv.total_rooms) -
        Number(inv.blocked_rooms) -
        Number(inv.booked_rooms) -
        heldOn(roomTypeId, date, excludeHolds);

      free = Math.min(free, available);
    }

    return { free: Number.isFinite(free) ? free : 0, allOnSale };
  }

  // ---- the functions ----------------------------------------------------

  const fns: Record<string, (args: any) => any> = {
    release_expired_holds: () => releaseExpiredHolds(),

    nightly_rate: ({ p_room_type_id, p_date }: any) => nightlyRate(p_room_type_id, p_date),

    next_invoice_number: () =>
      `INV-${new Date().getFullYear()}-${String(++counters.invoice).padStart(6, '0')}`,

    // -- PRD §40 ---------------------------------------------------------
    search_availability: ({
      p_hotel_id, p_check_in, p_check_out, p_adults = 1, p_children = 0, p_rooms = 1,
    }: any) => {
      if (p_check_out <= p_check_in) {
        throw new PgError('Check-out must be after check-in');
      }
      if (p_check_in < today()) {
        throw new PgError('Check-in cannot be in the past');
      }

      const hotel = find('hotels', (h) => h.id === p_hotel_id && h.status === 'ACTIVE');
      if (!hotel) return [];

      releaseExpiredHolds();

      const nights = eachNight(p_check_in, p_check_out);
      const roomsWanted = Math.max(Number(p_rooms) || 1, 1);
      const adults = Math.max(Number(p_adults) || 1, 1);
      const children = Math.max(Number(p_children) || 0, 0);

      return filter('room_types', (rt) => rt.hotel_id === p_hotel_id && rt.is_active)
        .filter(
          (rt) =>
            rt.max_adults * roomsWanted >= adults &&
            rt.max_children * roomsWanted >= children &&
            rt.max_occupancy * roomsWanted >= adults + children,
        )
        .sort((a, b) => a.sort_order - b.sort_order || a.base_price - b.base_price)
        .map((rt) => {
          const { free, allOnSale } = freeAcross(rt.id, p_check_in, p_check_out);
          const nightlyRates = nights.map((date) => ({ date, price: nightlyRate(rt.id, date) }));
          const perRoom = nightlyRates.reduce((s, n) => s + n.price, 0);
          const subtotal = money(perRoom * roomsWanted);
          const taxPercent = Number(rt.tax_percent ?? hotel.tax_percent);

          return {
            room_type_id: rt.id,
            name: rt.name,
            slug: rt.slug,
            description: rt.description,
            bed_type: rt.bed_type,
            max_adults: rt.max_adults,
            max_children: rt.max_children,
            max_occupancy: rt.max_occupancy,
            base_price: Number(rt.base_price),
            available_rooms: Math.max(free, 0),
            nights: nights.length,
            nightly_rates: nightlyRates,
            room_subtotal: subtotal,
            tax_percent: taxPercent,
            tax_amount: money((subtotal * taxPercent) / 100),
            total_price: money(subtotal * (1 + taxPercent / 100)),
            is_available: free >= roomsWanted && allOnSale,
          };
        });
    },

    // -- PRD §9 ----------------------------------------------------------
    ensure_room_inventory: ({ p_room_type_id, p_from, p_to, p_total_rooms }: any) => {
      const rt = find('room_types', (r) => r.id === p_room_type_id);
      if (!rt) throw new PgError(`Unknown room type ${p_room_type_id}`, 'P0002');

      const fallback = filter(
        'rooms',
        (r) => r.room_type_id === p_room_type_id && r.status !== 'MAINTENANCE',
      ).length;

      const total = p_total_rooms ?? fallback ?? 0;
      let n = 0;

      for (const stay_date of eachNight(p_from, p_to)) {
        const existing = find(
          'room_inventory',
          (r) => r.room_type_id === p_room_type_id && r.stay_date === stay_date,
        );

        if (existing) {
          // Never drop allocation below what is already committed.
          existing.total_rooms = Math.max(
            total,
            Number(existing.booked_rooms) + Number(existing.blocked_rooms),
          );
        } else {
          tables.room_inventory.push({
            id: randomUUID(), hotel_id: rt.hotel_id, room_type_id: p_room_type_id,
            stay_date, total_rooms: total, blocked_rooms: 0, booked_rooms: 0,
            is_closed: false, updated_at: new Date().toISOString(),
          });
        }
        n++;
      }

      return n;
    },

    // -- PRD §10 ---------------------------------------------------------
    create_booking_hold: ({
      p_room_type_id, p_check_in, p_check_out, p_rooms, p_session_id, p_minutes = 15,
    }: any) => {
      releaseExpiredHolds();

      const rt = find('room_types', (r) => r.id === p_room_type_id && r.is_active);
      if (!rt) throw new PgError('Room type is not available', 'P0002');

      const { free, allOnSale } = freeAcross(p_room_type_id, p_check_in, p_check_out);

      if (!allOnSale) throw new PgError('Selected dates are unavailable');
      if (free < p_rooms) {
        throw new PgError(`Only ${Math.max(free, 0)} room(s) left for these dates`);
      }

      const hold: Row = {
        id: randomUUID(),
        hotel_id: rt.hotel_id,
        room_type_id: p_room_type_id,
        check_in: p_check_in,
        check_out: p_check_out,
        rooms: p_rooms,
        session_id: p_session_id,
        profile_id: null,
        expires_at: new Date(Date.now() + Math.max(p_minutes, 1) * 60_000).toISOString(),
        released_at: null,
        created_at: new Date().toISOString(),
      };

      tables.booking_holds.push(hold);
      return hold;
    },

    release_booking_hold: ({ p_hold_id }: any) => {
      const hold = find('booking_holds', (h) => h.id === p_hold_id && !h.released_at);
      if (!hold) return false;
      hold.released_at = new Date().toISOString();
      return true;
    },

    // -- PRD §41 ---------------------------------------------------------
    create_booking_transaction: ({
      p_hotel_id, p_website_id, p_customer_id, p_check_in, p_check_out,
      p_rooms, p_guest, p_pricing, p_guests = [], p_transport = [],
      p_hold_ids = [], p_coupon_code = null, p_source = 'WEBSITE',
    }: any) => {
      const nights = eachNight(p_check_in, p_check_out);
      if (nights.length === 0) throw new PgError('Check-out must be after check-in');
      if (!p_rooms?.length) throw new PgError('At least one room is required');

      releaseExpiredHolds();

      // This checkout's own holds must not block its own booking.
      const ownHolds: string[] = p_hold_ids ?? [];
      for (const id of ownHolds) {
        const hold = find('booking_holds', (h) => h.id === id && !h.released_at);
        if (hold) hold.released_at = new Date().toISOString();
      }

      // Validate every line before consuming anything, so a partial failure
      // cannot leave inventory half-decremented.
      for (const line of p_rooms) {
        const rt = find(
          'room_types',
          (r) => r.id === line.room_type_id && r.hotel_id === p_hotel_id && r.is_active,
        );
        if (!rt) throw new PgError('Room is no longer available', 'P0002');

        const { free } = freeAcross(line.room_type_id, p_check_in, p_check_out, ownHolds);
        if (free < (line.rooms ?? 1)) {
          throw new PgError(`Room no longer available: ${rt.name}`);
        }
      }

      for (const line of p_transport ?? []) {
        const slot = find(
          'transport_slots',
          (s) => s.id === line.slot_id && s.hotel_id === p_hotel_id && s.status === 'ACTIVE',
        );
        if (!slot) throw new PgError('Selected transport is unavailable', 'P0002');
        const free = Number(slot.seat_capacity) - Number(slot.booked_seats);
        if (free < line.seats) throw new PgError(`Only ${free} seat(s) left on this route`);
      }

      if (p_coupon_code && Number(p_pricing?.coupon_discount ?? 0) > 0) {
        const coupon = find('coupons', (c) => c.code.toUpperCase() === String(p_coupon_code).toUpperCase() && c.is_active);
        if (coupon?.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
          throw new PgError('This coupon has reached its usage limit');
        }
      }

      // ---- everything validated; now commit ----------------------------
      let totalRooms = 0;

      for (const line of p_rooms) {
        const count = line.rooms ?? 1;
        totalRooms += count;
        for (const date of nights) {
          const inv = find(
            'room_inventory',
            (r) => r.room_type_id === line.room_type_id && r.stay_date === date,
          )!;
          inv.booked_rooms = Number(inv.booked_rooms) + count;
        }
      }

      const nowIso = new Date().toISOString();
      const reference = `AQH-${new Date().getFullYear()}-${String(++counters.booking).padStart(6, '0')}`;

      const booking: Row = {
        id: randomUUID(),
        reference,
        hotel_id: p_hotel_id,
        website_id: p_website_id,
        customer_id: p_customer_id,
        guest_name: p_guest.name,
        guest_email: String(p_guest.email).toLowerCase(),
        guest_phone: p_guest.phone,
        guest_address: p_guest.address ?? null,
        special_requests: p_guest.special_requests ?? null,
        check_in: p_check_in,
        check_out: p_check_out,
        nights: nights.length,
        adults: p_guest.adults ?? 1,
        children: p_guest.children ?? 0,
        rooms_count: totalRooms,
        status: 'PENDING',
        payment_status: 'PENDING',
        currency: p_pricing?.currency ?? 'INR',
        room_subtotal: Number(p_pricing?.room_subtotal ?? 0),
        extra_services_total: Number(p_pricing?.extra_services_total ?? 0),
        transport_total: Number(p_pricing?.transport_total ?? 0),
        discount_total: Number(p_pricing?.discount_total ?? 0),
        coupon_code: p_coupon_code,
        coupon_discount: Number(p_pricing?.coupon_discount ?? 0),
        tax_total: Number(p_pricing?.tax_total ?? 0),
        total_amount: Number(p_pricing?.total_amount ?? 0),
        amount_paid: 0,
        amount_refunded: 0,
        price_breakdown: p_pricing ?? {},
        source: p_source ?? 'WEBSITE',
        cancellation_reason: null,
        cancelled_at: null,
        checked_in_at: null,
        checked_out_at: null,
        created_by: p_customer_id,
        created_at: nowIso,
        updated_at: nowIso,
      };

      tables.bookings.push(booking);

      tables.booking_status_history.push({
        id: randomUUID(), booking_id: booking.id, from_status: null,
        to_status: 'PENDING', note: null, changed_by: p_customer_id, created_at: nowIso,
      });

      for (const line of p_rooms) {
        const rt = find('room_types', (r) => r.id === line.room_type_id)!;
        tables.booking_rooms.push({
          id: randomUUID(), booking_id: booking.id, room_type_id: line.room_type_id,
          room_id: null, room_type_name: rt.name, rooms: line.rooms ?? 1,
          adults: line.adults ?? 1, children: line.children ?? 0,
          nightly_rates: line.nightly_rates ?? [],
          subtotal: Number(line.subtotal ?? 0), discount: Number(line.discount ?? 0),
          tax: Number(line.tax ?? 0), total: Number(line.total ?? 0),
          created_at: nowIso,
        });
      }

      for (const guest of p_guests ?? []) {
        tables.booking_guests.push({
          id: randomUUID(), booking_id: booking.id, full_name: guest.full_name,
          age: guest.age ?? null, is_child: guest.is_child ?? false,
          id_type: null, id_number: null, created_at: nowIso,
        });
      }

      for (const line of p_transport ?? []) {
        const slot = find('transport_slots', (s) => s.id === line.slot_id)!;
        slot.booked_seats = Number(slot.booked_seats) + line.seats;
        const route = find('transport_routes', (r) => r.id === slot.route_id);

        tables.transport_bookings.push({
          id: randomUUID(), booking_id: booking.id, hotel_id: p_hotel_id,
          slot_id: slot.id, route_name: route?.name ?? 'Transport',
          customer_id: p_customer_id, seats: line.seats, pickup_time: null,
          amount: Number(line.amount ?? 0), status: 'PENDING', notes: null,
          created_at: nowIso, updated_at: nowIso,
        });
      }

      if (p_coupon_code && Number(p_pricing?.coupon_discount ?? 0) > 0) {
        const coupon = find('coupons', (c) => c.code.toUpperCase() === String(p_coupon_code).toUpperCase() && c.is_active);
        if (coupon) {
          coupon.used_count = Number(coupon.used_count) + 1;
          tables.coupon_redemptions.push({
            id: randomUUID(), coupon_id: coupon.id, booking_id: booking.id,
            customer_id: p_customer_id, amount: Number(p_pricing.coupon_discount),
            created_at: nowIso,
          });
        }
      }

      return booking;
    },

    // -- PRD §26 ---------------------------------------------------------
    cancel_booking: ({ p_booking_id, p_reason = null }: any) => {
      const booking = find('bookings', (b) => b.id === p_booking_id);
      if (!booking) throw new PgError('Booking not found', 'P0002');
      if (['CANCELLED', 'REFUNDED'].includes(booking.status)) return booking;
      if (booking.status === 'CHECKED_OUT') {
        throw new PgError('A completed stay cannot be cancelled');
      }

      const nights = eachNight(booking.check_in, booking.check_out);

      for (const line of filter('booking_rooms', (r) => r.booking_id === p_booking_id)) {
        for (const date of nights) {
          const inv = find(
            'room_inventory',
            (r) => r.room_type_id === line.room_type_id && r.stay_date === date,
          );
          if (inv) inv.booked_rooms = Math.max(Number(inv.booked_rooms) - Number(line.rooms), 0);
        }
      }

      for (const tb of filter(
        'transport_bookings',
        (t) => t.booking_id === p_booking_id && t.status !== 'CANCELLED',
      )) {
        const slot = find('transport_slots', (s) => s.id === tb.slot_id);
        if (slot) slot.booked_seats = Math.max(Number(slot.booked_seats) - Number(tb.seats), 0);
        tb.status = 'CANCELLED';
      }

      const previous = booking.status;
      booking.status = 'CANCELLED';
      booking.cancellation_reason = p_reason;
      booking.cancelled_at = new Date().toISOString();
      booking.updated_at = booking.cancelled_at;

      tables.booking_status_history.push({
        id: randomUUID(), booking_id: booking.id, from_status: previous,
        to_status: 'CANCELLED', note: p_reason, changed_by: null,
        created_at: booking.cancelled_at,
      });

      return booking;
    },

    // -- PRD §27 ---------------------------------------------------------
    confirm_booking_payment: ({ p_booking_id, p_payment_id }: any) => {
      const booking = find('bookings', (b) => b.id === p_booking_id);
      if (!booking) throw new PgError('Booking not found', 'P0002');

      const payment = find('payments', (p) => p.id === p_payment_id);
      if (payment) {
        payment.status = 'PAID';
        payment.paid_at = payment.paid_at ?? new Date().toISOString();
      }

      const paid = filter(
        'payments',
        (p) => p.booking_id === p_booking_id && p.status === 'PAID',
      ).reduce((s, p) => s + Number(p.amount), 0);

      const previous = booking.status;
      booking.amount_paid = paid;
      booking.payment_status = paid >= Number(booking.total_amount) ? 'PAID' : 'PENDING';
      if (paid >= Number(booking.total_amount)) booking.status = 'CONFIRMED';
      booking.updated_at = new Date().toISOString();

      if (previous !== booking.status) {
        tables.booking_status_history.push({
          id: randomUUID(), booking_id: booking.id, from_status: previous,
          to_status: booking.status, note: null, changed_by: null,
          created_at: booking.updated_at,
        });
      }

      for (const tb of filter(
        'transport_bookings',
        (t) => t.booking_id === p_booking_id && t.status === 'PENDING',
      )) {
        tb.status = booking.status;
      }

      return booking;
    },

    // -- PRD §30 ---------------------------------------------------------
    validate_coupon: ({
      p_code, p_hotel_id, p_amount, p_customer_id = null, p_room_type_ids = [],
    }: any) => {
      const fail = (message: string, id: string | null = null) => [
        { valid: false, discount: 0, message, coupon_id: id },
      ];

      const c = find('coupons', (x) => x.code.toUpperCase() === String(p_code).toUpperCase() && x.is_active);
      if (!c) return fail('Invalid coupon');

      const nowIso = new Date().toISOString();
      if (c.valid_from && nowIso < c.valid_from) return fail('This coupon is not active yet', c.id);
      if (c.valid_until && nowIso > c.valid_until) return fail('This coupon has expired', c.id);
      if (c.usage_limit != null && c.used_count >= c.usage_limit) {
        return fail('This coupon has reached its usage limit', c.id);
      }
      if (c.hotel_ids?.length && !c.hotel_ids.includes(p_hotel_id)) {
        return fail('This coupon is not valid for this hotel', c.id);
      }
      if (
        c.room_type_ids?.length &&
        !c.room_type_ids.some((id: string) => (p_room_type_ids ?? []).includes(id))
      ) {
        return fail('This coupon is not valid for the selected rooms', c.id);
      }
      if (Number(p_amount) < Number(c.min_booking_amount)) {
        return fail(`Minimum booking amount for this coupon is ${c.min_booking_amount}`, c.id);
      }
      if (c.usage_limit_per_user != null && p_customer_id) {
        const used = filter(
          'coupon_redemptions',
          (r) => r.coupon_id === c.id && r.customer_id === p_customer_id,
        ).length;
        if (used >= c.usage_limit_per_user) return fail('You have already used this coupon', c.id);
      }

      let discount = c.discount_percent != null
        ? money((Number(p_amount) * Number(c.discount_percent)) / 100)
        : Number(c.discount_amount);

      if (c.max_discount != null) discount = Math.min(discount, Number(c.max_discount));
      discount = Math.min(discount, Number(p_amount));

      return [{ valid: true, discount, message: 'Coupon applied', coupon_id: c.id }];
    },
  };

  return async function rpc(name: string, args: Record<string, unknown> = {}) {
    const fn = fns[name];

    if (!fn) {
      return { data: null, error: { message: `Unknown function ${name}`, code: '42883' } };
    }

    try {
      return { data: fn(args), error: null };
    } catch (err) {
      const e = err as PgError;
      return { data: null, error: { message: e.message, code: e.code ?? 'P0001' } };
    }
  };
}
