/**
 * The demo database: one in-memory dataset per server process.
 *
 * Built once on first access and mutated from then on, so bookings you make
 * while the server is up are real. Restarting resets everything to the same
 * deterministic starting point.
 */

import { randomUUID } from 'node:crypto';
import { buildDataset, type Tables, type Row } from './dataset';

export const DEMO_PASSWORD = 'demo1234';

export interface DemoAccount {
  email: string;
  password: string;
  fullName: string;
  mobile: string;
  role?: string;
  /** Number of hotels this admin is scoped to; 0 = all. */
  scopeCount?: number;
  /** Scope to the hotel with this slug instead of the first `scopeCount`. */
  scopeHotelSlug?: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@aqoss.demo', password: DEMO_PASSWORD, fullName: 'Asha Raman',
    mobile: '+91 90000 00001', role: 'super_admin',
    description: 'Full access to every CRM module',
  },
  {
    email: 'manager@aqoss.demo', password: DEMO_PASSWORD, fullName: 'Vikram Shetty',
    mobile: '+91 90000 00002', role: 'hotel_manager', scopeCount: 3,
    description: 'Hotels, rooms, pricing and availability — scoped to 3 properties',
  },
  {
    email: 'serenity@aqoss.demo', password: DEMO_PASSWORD, fullName: 'Nisha Pai',
    mobile: '+91 90000 00006', role: 'property_manager', scopeHotelSlug: 'the-serenity-inn-goa-1',
    description: 'Runs The Serenity Inn only — bookings, rooms, pricing, website and payments',
  },
  {
    email: 'bookings@aqoss.demo', password: DEMO_PASSWORD, fullName: 'Leena Fernandes',
    mobile: '+91 90000 00003', role: 'booking_manager',
    description: 'Bookings, customers, check-in and check-out',
  },
  {
    email: 'finance@aqoss.demo', password: DEMO_PASSWORD, fullName: 'Rahul Bhat',
    mobile: '+91 90000 00004', role: 'finance_staff',
    description: 'Payments, refunds and reports — no booking edits',
  },
  {
    email: 'guest@aqoss.demo', password: DEMO_PASSWORD, fullName: 'Meera Krishnan',
    mobile: '+91 90000 00005',
    description: 'A customer with booking history',
  },
];

/**
 * The store hangs off `globalThis`, not a module-level variable.
 *
 * Next.js compiles route handlers, server components and server actions into
 * separate bundles and re-evaluates modules on every hot reload, so a plain
 * `let` gives each of them its own copy — which means a room you see on one
 * page does not exist on the next. A global symbol is the one slot they share.
 */
const STORE_KEY = Symbol.for('aqoss.demo.store');

interface DemoStore {
  tables: Tables;
  /** Sequences for booking references and invoice numbers. */
  counters: { booking: number; invoice: number };
}

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: DemoStore };

function build(): DemoStore {
  const started = Date.now();

  const tables = buildDataset({
    hotels: Number(process.env.DEMO_HOTELS ?? 52),
    inventoryDays: Number(process.env.DEMO_INVENTORY_DAYS ?? 120),
    transportDays: Number(process.env.DEMO_TRANSPORT_DAYS ?? 21),
  });

  seedAccounts(tables);
  seedHistory(tables);
  seedBookingVolume(tables);

  console.info(
    `[aqoss] demo data ready in ${Date.now() - started}ms — ` +
      `${tables.hotels.length} hotels, ${tables.room_types.length} room types, ` +
      `${tables.room_inventory.length} inventory nights`,
  );

  return { tables, counters: { booking: 0, invoice: 0 } };
}

export function getStore(): DemoStore {
  const g = globalThis as GlobalWithStore;
  if (!g[STORE_KEY]) g[STORE_KEY] = build();
  return g[STORE_KEY]!;
}

export function getTables(): Tables {
  return getStore().tables;
}

/** Reset to the deterministic starting state. */
export function resetTables(): void {
  (globalThis as GlobalWithStore)[STORE_KEY] = build();
}

// ---------------------------------------------------------------------------

function seedAccounts(t: Tables) {
  const nowIso = new Date().toISOString();

  for (const account of DEMO_ACCOUNTS) {
    const profileId = randomUUID();

    t.profiles.push({
      id: profileId,
      full_name: account.fullName,
      email: account.email,
      mobile: account.mobile,
      profile_photo: null,
      address_line1: '12 Residency Road',
      address_line2: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '560025',
      date_of_birth: null,
      id_type: null,
      id_number: null,
      is_admin: Boolean(account.role),
      is_active: true,
      marketing_optin: false,
      metadata: { demo_password: account.password },
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (account.role) {
      const role = t.roles.find((r) => r.key === account.role)!;
      t.admin_users.push({
        id: randomUUID(),
        profile_id: profileId,
        role_id: role.id,
        hotel_scope: account.scopeHotelSlug
          ? t.hotels.filter((h) => h.slug === account.scopeHotelSlug).map((h) => h.id)
          : account.scopeCount
            ? t.hotels.slice(0, account.scopeCount).map((h) => h.id)
            : [],
        is_active: true,
        created_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  }
}

/**
 * Give the demo customer a history, so the dashboard, invoices, cancellation
 * and review flows all have something to show on a fresh boot.
 */
function seedHistory(t: Tables) {
  const guest = t.profiles.find((p) => p.email === 'guest@aqoss.demo');
  if (!guest) return;

  const offsets: { days: number; status: string; payment: string }[] = [
    { days: -46, status: 'CHECKED_OUT', payment: 'PAID' },
    { days: -18, status: 'CHECKED_OUT', payment: 'PAID' },
    { days: 12, status: 'CONFIRMED', payment: 'PAID' },
    { days: -60, status: 'CANCELLED', payment: 'REFUNDED' },
  ];

  offsets.forEach((entry, i) => {
    const hotel = t.hotels[i * 3];
    if (!hotel) return;

    const roomType = t.room_types.find((rt) => rt.hotel_id === hotel.id);
    if (!roomType) return;

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + entry.days);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const nights = 2;
    const subtotal = Number(roomType.base_price) * nights;
    const tax = Math.round((subtotal * Number(hotel.tax_percent)) / 100);
    const total = subtotal + tax;
    const createdAt = new Date(checkIn.getTime() - 14 * 86_400_000).toISOString();
    const bookingId = randomUUID();
    const refunded = entry.payment === 'REFUNDED' ? total : 0;

    t.bookings.push({
      id: bookingId,
      reference: `AQH-${new Date().getFullYear()}-${String(900001 + i).padStart(6, '0')}`,
      hotel_id: hotel.id,
      website_id: t.websites.find((w) => w.hotel_id === hotel.id)?.id ?? null,
      customer_id: guest.id,
      guest_name: guest.full_name,
      guest_email: guest.email,
      guest_phone: guest.mobile,
      guest_address: null,
      special_requests: i === 0 ? 'High floor if possible, please.' : null,
      check_in: fmt(checkIn),
      check_out: fmt(checkOut),
      nights,
      adults: 2,
      children: 0,
      rooms_count: 1,
      status: entry.status,
      payment_status: entry.payment,
      currency: 'INR',
      room_subtotal: subtotal,
      extra_services_total: 0,
      transport_total: 0,
      discount_total: 0,
      coupon_code: null,
      coupon_discount: 0,
      tax_total: tax,
      total_amount: total,
      amount_paid: entry.payment === 'PAID' || refunded ? total : 0,
      amount_refunded: refunded,
      price_breakdown: {},
      source: 'WEBSITE',
      cancellation_reason: entry.status === 'CANCELLED' ? 'Change of plans' : null,
      cancelled_at: entry.status === 'CANCELLED' ? createdAt : null,
      checked_in_at: null,
      checked_out_at: entry.status === 'CHECKED_OUT' ? fmt(checkOut) : null,
      created_by: guest.id,
      created_at: createdAt,
      updated_at: createdAt,
    });

    t.booking_rooms.push({
      id: randomUUID(), booking_id: bookingId, room_type_id: roomType.id, room_id: null,
      room_type_name: roomType.name, rooms: 1, adults: 2, children: 0,
      nightly_rates: [], subtotal, discount: 0, tax, total,
      created_at: createdAt,
    });

    t.booking_status_history.push({
      id: randomUUID(), booking_id: bookingId, from_status: null,
      to_status: entry.status, note: null, changed_by: null, created_at: createdAt,
    });

    if (entry.payment !== 'PENDING') {
      const paymentId = randomUUID();
      t.payments.push({
        id: paymentId, booking_id: bookingId, customer_id: guest.id, hotel_id: hotel.id,
        provider: 'mock', provider_order_id: `mock_order_${i}`,
        provider_payment_id: `mock_pay_${i}`, provider_signature: null,
        amount: total, tax, discount: 0, currency: 'INR',
        status: entry.payment, method: 'card', failure_reason: null,
        raw_response: {}, paid_at: createdAt, created_at: createdAt, updated_at: createdAt,
      });

      t.invoices.push({
        id: randomUUID(), booking_id: bookingId, hotel_id: hotel.id,
        invoice_number: `INV-${new Date().getFullYear()}-${String(900001 + i).padStart(6, '0')}`,
        issued_to: guest.full_name, issued_email: guest.email, currency: 'INR',
        subtotal, discount: 0, tax, total,
        line_items: [{ description: `${roomType.name} × 1`, quantity: 1, amount: subtotal }],
        pdf_url: null, issued_at: createdAt, created_at: createdAt,
      });
    }

    // One stay is already reviewed; the other stays reviewable, so both the
    // "write a review" prompt and the moderation queue have content.
    if (i === 1) {
      t.reviews.push({
        id: randomUUID(), hotel_id: hotel.id, booking_id: bookingId, customer_id: guest.id,
        author_name: guest.full_name, rating: 5,
        title: 'Genuinely lovely stay',
        comment: 'Everything from check-in to check-out was smooth, and the room was exactly as pictured.',
        cleanliness_rating: 5, service_rating: 5, location_rating: 4, value_rating: 5,
        status: 'PENDING', admin_response: null, responded_at: null, moderated_by: null,
        created_at: new Date(checkOut.getTime() + 86_400_000).toISOString(),
        updated_at: nowIsoSafe(),
      });
    }
  });
}

const nowIsoSafe = () => new Date().toISOString();

// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Rahul', 'Priya', 'Sanjay', 'Ankit', 'Neha', 'Rhea', 'Vikram', 'Ananya',
  'Karan', 'Isha', 'Nikhil', 'Tara', 'Aman', 'Sana', 'Dev', 'Kavya',
  'Rohan', 'Pooja', 'Imran', 'Lata', 'Arjun', 'Diya', 'Farhan', 'Gayatri',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Desai', 'Verma', 'Kapoor', 'Singh', 'Mehta',
  'Rao', 'Joshi', 'Menon', 'Gupta', 'Qureshi', 'Nair', 'Shetty', 'Bhatt',
  'Sheikh', 'Pillai', 'Iyer', 'Banerjee', 'Chauhan', 'Reddy',
];

/**
 * Background booking volume across the last few months.
 *
 * Without it the dashboard charts and period-over-period tiles have nothing to
 * plot on a fresh boot. These are ordinary booking rows — the same shape the
 * booking engine writes — so every report reads them normally.
 */
function seedBookingVolume(t: Tables) {
  const DAYS_BACK = 75;
  const seedRand = (n: number) => {
    const x = Math.sin(n * 7.13) * 10000;
    return x - Math.floor(x);
  };

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  let counter = 0;
  const customersByEmail = new Map<string, Row>();

  for (let back = DAYS_BACK; back >= 0; back--) {
    const created = new Date();
    created.setDate(created.getDate() - back);
    const weekday = created.getDay();

    // Weekends book more; recent weeks book more than older ones.
    const base = weekday === 5 || weekday === 6 ? 5 : 3;
    const recency = 1 + (DAYS_BACK - back) / DAYS_BACK;
    const count = Math.max(0, Math.round((base + seedRand(back) * 4) * recency * 0.6));

    for (let i = 0; i < count; i++) {
      const seed = back * 97 + i * 13;
      const hotel = t.hotels[Math.floor(seedRand(seed) * t.hotels.length)];
      if (!hotel) continue;

      const roomTypes = t.room_types.filter((rt) => rt.hotel_id === hotel.id);
      const roomType = roomTypes[Math.floor(seedRand(seed + 3) * roomTypes.length)];
      if (!roomType) continue;

      const nights = 1 + Math.floor(seedRand(seed + 5) * 4);
      const rooms = seedRand(seed + 9) > 0.85 ? 2 : 1;

      // Stays sit a few days either side of the booking date.
      const checkIn = new Date(created);
      checkIn.setDate(checkIn.getDate() + Math.floor(seedRand(seed + 7) * 24) - 4);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + nights);

      const subtotal = Number(roomType.base_price) * nights * rooms;
      const tax = Math.round((subtotal * Number(hotel.tax_percent)) / 100);
      const total = subtotal + tax;

      const roll = seedRand(seed + 11);
      const past = checkOut < new Date();
      let status: string;
      let payment: string;

      if (roll > 0.93) {
        status = 'CANCELLED';
        payment = roll > 0.965 ? 'REFUNDED' : 'PENDING';
      } else if (roll > 0.87) {
        status = 'PENDING';
        payment = 'PENDING';
      } else if (past) {
        status = 'CHECKED_OUT';
        payment = 'PAID';
      } else {
        status = 'CONFIRMED';
        payment = 'PAID';
      }

      const refunded = payment === 'REFUNDED' ? total : 0;
      const paid = payment === 'PAID' || payment === 'REFUNDED' ? total : 0;
      const createdAt = new Date(created);
      createdAt.setHours(8 + Math.floor(seedRand(seed + 17) * 12));
      const createdIso = createdAt.toISOString();

      const bookingId = randomUUID();

      const guest =
        `${FIRST_NAMES[Math.floor(seedRand(seed + 19) * FIRST_NAMES.length)]} ` +
        `${LAST_NAMES[Math.floor(seedRand(seed + 37) * LAST_NAMES.length)]}`;

      const guestEmail = `${guest.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;

      // Guests are real customer records, so the CRM can show their history
      // and the dashboard's customer count means something.
      let customer = customersByEmail.get(guestEmail);
      if (!customer) {
        customer = {
          id: randomUUID(),
          full_name: guest,
          email: guestEmail,
          mobile: `+91 98${String(100000 + customersByEmail.size).slice(0, 6)}`,
          profile_photo: null,
          address_line1: null, address_line2: null,
          city: null, state: null, country: 'India', postal_code: null,
          date_of_birth: null, id_type: null, id_number: null,
          is_admin: false, is_active: true, marketing_optin: false,
          metadata: {},
          // Registered a little before their first booking.
          created_at: new Date(createdAt.getTime() - 86_400_000).toISOString(),
          updated_at: createdIso,
        };
        customersByEmail.set(guestEmail, customer);
        t.profiles.push(customer);
      }

      t.bookings.push({
        id: bookingId,
        reference: `AQH-${createdAt.getFullYear()}-${String(100000 + counter).padStart(6, '0')}`,
        hotel_id: hotel.id,
        website_id: t.websites.find((w) => w.hotel_id === hotel.id)?.id ?? null,
        customer_id: customer.id,
        guest_name: guest,
        guest_email: guestEmail,
        guest_phone: `+91 98${String(100000 + counter).slice(0, 6)}`,
        guest_address: null,
        special_requests: null,
        check_in: fmt(checkIn),
        check_out: fmt(checkOut),
        nights,
        adults: 1 + Math.floor(seedRand(seed + 23) * 3),
        children: seedRand(seed + 29) > 0.75 ? 1 : 0,
        rooms_count: rooms,
        status,
        payment_status: payment,
        currency: 'INR',
        room_subtotal: subtotal,
        extra_services_total: 0,
        transport_total: 0,
        discount_total: 0,
        coupon_code: null,
        coupon_discount: 0,
        tax_total: tax,
        total_amount: total,
        amount_paid: paid,
        amount_refunded: refunded,
        price_breakdown: {},
        source: 'WEBSITE',
        cancellation_reason: status === 'CANCELLED' ? 'Change of plans' : null,
        cancelled_at: status === 'CANCELLED' ? createdIso : null,
        checked_in_at: null,
        checked_out_at: status === 'CHECKED_OUT' ? fmt(checkOut) : null,
        created_by: null,
        created_at: createdIso,
        updated_at: createdIso,
      });

      t.booking_rooms.push({
        id: randomUUID(), booking_id: bookingId, room_type_id: roomType.id, room_id: null,
        room_type_name: roomType.name, rooms, adults: 2, children: 0,
        nightly_rates: [], subtotal, discount: 0, tax, total, created_at: createdIso,
      });

      t.booking_status_history.push({
        id: randomUUID(), booking_id: bookingId, from_status: null, to_status: status,
        note: null, changed_by: null, created_at: createdIso,
      });

      if (paid > 0) {
        t.payments.push({
          id: randomUUID(), booking_id: bookingId, customer_id: customer.id, hotel_id: hotel.id,
          provider: 'mock', provider_order_id: `mock_order_bg_${counter}`,
          provider_payment_id: `mock_pay_bg_${counter}`, provider_signature: null,
          amount: total, tax, discount: 0, currency: 'INR',
          status: payment, method: seedRand(seed + 31) > 0.5 ? 'card' : 'upi',
          failure_reason: null, raw_response: {},
          paid_at: createdIso, created_at: createdIso, updated_at: createdIso,
        });
      }

      // Reserve the nights so availability reflects these bookings.
      if (status !== 'CANCELLED') {
        for (const d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
          const inv = t.room_inventory.find(
            (r) => r.room_type_id === roomType.id && r.stay_date === fmt(d),
          );
          if (inv && inv.booked_rooms + inv.blocked_rooms + rooms <= inv.total_rooms) {
            inv.booked_rooms += rooms;
          }
        }
      }

      counter++;
    }
  }
}

export type { Tables, Row };
