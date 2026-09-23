/**
 * AQOSS demo seeder (PRD §50).
 *
 * Creates 50+ hotels, each with a website, room types, physical rooms, a
 * year of inventory and rates, policies, amenities, transport, offers and
 * reviews — all as database records. Adding hotel 51 is the same operation,
 * so nothing here is special-cased in the frontend.
 *
 *   npm run seed              # create/refresh the demo dataset
 *   npm run seed -- --reset   # delete existing demo data first
 *   npm run seed -- --count=8 # fewer hotels, for a quick local run
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY: it writes through RLS.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill them in before seeding.',
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const COUNT = Number(args.find((a) => a.startsWith('--count='))?.split('=')[1] ?? 52);
const INVENTORY_DAYS = Number(args.find((a) => a.startsWith('--days='))?.split('=')[1] ?? 180);

// ---------------------------------------------------------------------------
// Source material — combined into plausible, varied properties
// ---------------------------------------------------------------------------

const CITIES = [
  ['Goa', 'Goa', 15.2993, 74.124],
  ['Jaipur', 'Rajasthan', 26.9124, 75.7873],
  ['Udaipur', 'Rajasthan', 24.5854, 73.7125],
  ['Manali', 'Himachal Pradesh', 32.2432, 77.1892],
  ['Shimla', 'Himachal Pradesh', 31.1048, 77.1734],
  ['Rishikesh', 'Uttarakhand', 30.0869, 78.2676],
  ['Munnar', 'Kerala', 10.0889, 77.0595],
  ['Alleppey', 'Kerala', 9.4981, 76.3388],
  ['Ooty', 'Tamil Nadu', 11.4064, 76.6932],
  ['Coorg', 'Karnataka', 12.3375, 75.8069],
  ['Mysore', 'Karnataka', 12.2958, 76.6394],
  ['Darjeeling', 'West Bengal', 27.041, 88.2663],
  ['Pondicherry', 'Puducherry', 11.9416, 79.8083],
  ['Varanasi', 'Uttar Pradesh', 25.3176, 82.9739],
  ['Agra', 'Uttar Pradesh', 27.1767, 78.0081],
  ['Mumbai', 'Maharashtra', 19.076, 72.8777],
  ['Pune', 'Maharashtra', 18.5204, 73.8567],
  ['Bengaluru', 'Karnataka', 12.9716, 77.5946],
  ['Hyderabad', 'Telangana', 17.385, 78.4867],
  ['New Delhi', 'Delhi', 28.6139, 77.209],
] as const;

const PREFIXES = ['The', 'Hotel', 'Grand', 'Royal', 'Casa', 'Villa', 'The', 'Hotel'];
const NAMES = [
  'Serenity', 'Orchid', 'Marigold', 'Aravalli', 'Bluebell', 'Palm Grove', 'Cinnamon',
  'Sandalwood', 'Monsoon', 'Lakeview', 'Hillcrest', 'Sunrise', 'Heritage', 'Meridian',
  'Coral', 'Banyan', 'Peacock', 'Riverstone', 'Emerald', 'Saffron', 'Mango Tree',
  'Whitewater', 'Old Town', 'Silver Oak', 'Lotus', 'Tamarind',
];
const SUFFIXES = ['Resort', 'Residency', 'Retreat', 'Inn', 'Suites', 'Palace', 'Stay', 'House'];

const HOTEL_AMENITIES = [
  ['Free Wi-Fi', 'general'], ['Swimming pool', 'wellness'], ['Spa', 'wellness'],
  ['Fitness centre', 'wellness'], ['Restaurant', 'food'], ['Room service', 'food'],
  ['Bar', 'food'], ['Free parking', 'general'], ['Airport shuttle', 'transport'],
  ['24-hour front desk', 'general'], ['Laundry service', 'general'],
  ['Business centre', 'general'], ['Garden', 'general'], ['Terrace', 'general'],
] as const;

const ROOM_TEMPLATES = [
  {
    name: 'Standard Room', bed: '1 Queen Bed', adults: 2, children: 1, occupancy: 3,
    size: 220, multiplier: 1,
    amenities: ['Free Wi-Fi', 'Air conditioning', 'Flat-screen TV', 'Tea/coffee maker'],
    description: 'A comfortable room with everything you need for a short stay, including a work desk and a private bathroom with complimentary toiletries.',
  },
  {
    name: 'Deluxe Room', bed: '1 King Bed', adults: 2, children: 2, occupancy: 4,
    size: 320, multiplier: 1.45,
    amenities: ['Free Wi-Fi', 'Breakfast included', 'Room service', 'Mini bar', 'Balcony'],
    description: 'A generously sized room with a king bed, a seating area and a private balcony. Breakfast for two is included every morning.',
  },
  {
    name: 'Executive Suite', bed: '1 King Bed + Sofa', adults: 3, children: 2, occupancy: 5,
    size: 520, multiplier: 2.2,
    amenities: ['Free Wi-Fi', 'Breakfast included', 'Separate living room', 'Bathtub', 'Lounge access'],
    description: 'A two-room suite with a separate living area, a large bathroom with a soaking tub, and access to the executive lounge.',
  },
  {
    name: 'Family Room', bed: '2 Queen Beds', adults: 4, children: 2, occupancy: 6,
    size: 450, multiplier: 1.8,
    amenities: ['Free Wi-Fi', 'Two queen beds', 'Extra bed on request', 'Kids welcome kit'],
    description: 'Built for families: two queen beds, plenty of storage and space for an extra bed if you need one.',
  },
];

const POLICIES = [
  ['check_in', 'Check-in & check-out', 'Check-in from 2:00 PM, check-out by 11:00 AM. Early check-in and late check-out are subject to availability and may be chargeable.'],
  ['cancellation', 'Cancellation policy', 'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours are charged one night. No-shows are charged the full stay.'],
  ['child', 'Child policy', 'Children under 6 stay free when sharing the existing bedding. Children 6 and over are charged as extra guests.'],
  ['extra_bed', 'Extra bed policy', 'One extra bed or mattress can be added to most rooms for an additional nightly charge, subject to availability.'],
  ['pet', 'Pet policy', 'Pets are not permitted, with the exception of registered service animals.'],
  ['smoking', 'Smoking policy', 'All rooms and indoor areas are strictly non-smoking. Designated smoking areas are available outdoors.'],
  ['id', 'ID requirements', 'A valid government-issued photo ID is required at check-in for every guest aged 18 and over. PAN cards are not accepted as ID proof.'],
  ['payment', 'Payment policy', 'The full amount is charged at the time of booking. Incidental charges are settled at check-out.'],
  ['damage', 'Damage policy', 'Guests are responsible for any damage to the room or its contents during their stay.'],
] as const;

const NEARBY_TEMPLATES = [
  ['airport', 'International Airport', 18, '35 min drive'],
  ['railway', 'Railway Station', 6, '15 min drive'],
  ['bus_stand', 'Central Bus Stand', 4, '10 min drive'],
  ['attraction', 'City Market', 2.5, '8 min drive'],
  ['attraction', 'Heritage Museum', 3.2, '10 min drive'],
] as const;

const TRANSPORT_ROUTES = [
  ['Hotel → Airport', 'Hotel lobby', 'International Airport', 18, 40, 400, 250],
  ['Hotel → Railway Station', 'Hotel lobby', 'Railway Station', 6, 20, 200, 120],
  ['Hotel → City Centre', 'Hotel lobby', 'City Centre', 4, 15, 150, 100],
] as const;

const REVIEW_SEEDS = [
  [5, 'Exactly as described', 'Spotless room, warm staff and a great breakfast. The check-in was quick even though we arrived late.'],
  [4, 'Great location', 'Very convenient for getting around, and the room was quiet despite being near the main road. Breakfast could have more variety.'],
  [5, 'Would stay again', 'The staff went out of their way to arrange an early check-in for us. Beautiful property and very well maintained.'],
  [4, 'Comfortable stay', 'Good value for the price. The room was clean and the bed was comfortable. Wi-Fi was a little slow in the evenings.'],
  [3, 'Decent but noisy', 'The room itself was fine, but there was construction nearby during the day. Staff were apologetic and helpful about it.'],
  [5, 'Lovely property', 'We loved the garden and the pool area. Perfect for a relaxed weekend away from the city.'],
];

const GUEST_NAMES = [
  'Ananya Sharma', 'Rohit Menon', 'Priya Iyer', 'Vikram Desai', 'Neha Kulkarni',
  'Arjun Nair', 'Sneha Reddy', 'Karan Malhotra', 'Divya Pillai', 'Aditya Bose',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function pick<T>(list: readonly T[], i: number): T {
  return list[i % list.length];
}

/** Deterministic pseudo-random in [0,1) so reruns produce the same dataset. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function photo(seed: string, w = 1200, h = 800) {
  // Deterministic placeholder photos; swap for Supabase Storage URLs in production.
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

async function insert(table: string, rows: Record<string, unknown>[], returning = 'id') {
  if (!rows.length) return [];
  const { data, error } = await db.from(table).insert(rows).select(returning);
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------

async function reset() {
  console.log('Removing existing demo data…');
  // hotels cascades to websites, rooms, inventory, reviews, transport, etc.
  const { error } = await db.from('hotels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`reset: ${error.message}`);

  await db.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Done.');
}

async function seedCoupons() {
  const coupons = [
    {
      code: 'WELCOME10', description: '10% off your first stay', offer_type: 'PERCENTAGE',
      discount_percent: 10, max_discount: 2000, min_booking_amount: 2000,
      usage_limit: 1000, usage_limit_per_user: 1,
      valid_until: new Date(Date.now() + 365 * 86_400_000).toISOString(), is_active: true,
    },
    {
      code: 'FLAT1000', description: 'Flat ₹1,000 off bookings over ₹8,000', offer_type: 'FIXED',
      discount_amount: 1000, min_booking_amount: 8000, usage_limit: 500, is_active: true,
      valid_until: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    },
    {
      code: 'EARLYBIRD15', description: '15% off when you book ahead', offer_type: 'EARLY_BIRD',
      discount_percent: 15, max_discount: 3000, min_booking_amount: 5000, is_active: true,
      valid_until: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    },
    {
      code: 'LASTMINUTE20', description: '20% off last-minute stays', offer_type: 'LAST_MINUTE',
      discount_percent: 20, max_discount: 2500, min_booking_amount: 3000, is_active: true,
      valid_until: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    },
  ];

  const { error } = await db.from('coupons').upsert(coupons, { onConflict: 'code' });
  if (error) throw new Error(`coupons: ${error.message}`);
  console.log(`✓ ${coupons.length} coupons`);
}

async function seedHotel(index: number) {
  const [city, state, lat, lng] = pick(CITIES, index);
  const name = `${pick(PREFIXES, index)} ${pick(NAMES, index)} ${pick(SUFFIXES, index + 3)}`;
  const slug = `${slugify(name)}-${slugify(city)}-${index + 1}`;
  const stars = 3 + Math.floor(rand(index + 1) * 3) * 0.5;
  const basePrice = 2200 + Math.floor(rand(index + 7) * 12) * 450;

  // ---- hotel ------------------------------------------------------------
  const { data: hotel, error } = await db
    .from('hotels')
    .insert({
      name,
      slug,
      tagline: `A ${stars >= 4.5 ? 'luxury' : stars >= 4 ? 'premium' : 'comfortable'} stay in ${city}`,
      description:
        `${name} sits a short drive from the centre of ${city}, with ${
          stars >= 4.5 ? 'generously appointed' : 'bright, well-kept'
        } rooms and an unhurried atmosphere.\n\n` +
        `The property has a multi-cuisine restaurant, round-the-clock room service and a team that knows ${city} well. ` +
        `Whether you are here for a weekend or a fortnight, the staff can arrange transport, tours and early check-in on request.`,
      logo_url: photo(`logo-${slug}`, 200, 200),
      star_rating: stars,
      status: 'ACTIVE',
      email: `reservations@${slugify(name)}.example.com`,
      phone: `+91 ${90000 + index * 137} ${10000 + index * 71}`,
      address_line1: `${10 + index} ${pick(['MG Road', 'Station Road', 'Lake View Road', 'Beach Road', 'Mall Road'], index)}`,
      city,
      state,
      country: 'India',
      postal_code: String(110001 + index * 37),
      latitude: lat + (rand(index) - 0.5) * 0.05,
      longitude: lng + (rand(index + 11) - 0.5) * 0.05,
      check_in_time: '14:00',
      check_out_time: '11:00',
      currency: 'INR',
      tax_percent: basePrice >= 7500 ? 18 : 12,
      highlights: [
        'Free Wi-Fi throughout the property',
        'Complimentary breakfast on select rates',
        '24-hour front desk and room service',
        `${Math.round(2 + rand(index + 3) * 6)} km from the city centre`,
      ],
    })
    .select('id, slug, name, tax_percent')
    .single();

  if (error) throw new Error(`hotel ${index}: ${error.message}`);

  // ---- gallery, amenities, policies, nearby -----------------------------
  await insert(
    'hotel_images',
    Array.from({ length: 6 }, (_, i) => ({
      hotel_id: hotel.id,
      url: photo(`${slug}-${i}`),
      alt_text: `${name} — photo ${i + 1}`,
      is_cover: i === 0,
      sort_order: i,
    })),
  );

  const amenityCount = 7 + Math.floor(rand(index + 5) * 7);
  await insert(
    'hotel_amenities',
    HOTEL_AMENITIES.slice(0, amenityCount).map(([aName, category], i) => ({
      hotel_id: hotel.id,
      name: aName,
      category,
      sort_order: i,
    })),
  );

  await insert(
    'hotel_policies',
    POLICIES.map(([policy_type, title, content], i) => ({
      hotel_id: hotel.id,
      policy_type,
      title,
      content,
      sort_order: i,
    })),
  );

  await insert(
    'hotel_nearby_places',
    NEARBY_TEMPLATES.map(([place_type, placeName, km, travel], i) => ({
      hotel_id: hotel.id,
      name: `${city} ${placeName}`,
      place_type,
      distance_km: Math.round((km + rand(index + i) * 6) * 10) / 10,
      travel_time: travel,
      sort_order: i,
    })),
  );

  // ---- website ----------------------------------------------------------
  const { data: template } = await db
    .from('website_templates')
    .select('id')
    .eq('key', 'classic')
    .maybeSingle();

  const palette = [
    ['#0F766E', '#F59E0B'], ['#1D4ED8', '#F97316'], ['#9D174D', '#FBBF24'],
    ['#15803D', '#EA580C'], ['#6D28D9', '#F59E0B'], ['#B45309', '#0EA5E9'],
  ];
  const [primary, accent] = pick(palette, index);

  const { data: website, error: websiteError } = await db
    .from('websites')
    .insert({
      hotel_id: hotel.id,
      template_id: template?.id ?? null,
      name: `${name} Website`,
      slug,
      status: 'ACTIVE',
      logo_url: photo(`logo-${slug}`, 200, 200),
      primary_color: primary,
      accent_color: accent,
      seo_title: `${name} · Book direct in ${city}`,
      seo_description: `Book ${name} in ${city} directly. Live availability, best available rates and instant confirmation.`,
      og_image_url: photo(`${slug}-0`),
      robots_indexable: true,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (websiteError) throw new Error(`website ${index}: ${websiteError.message}`);

  await insert('website_domains', [
    { website_id: website.id, hostname: `${slug}.localhost`, is_primary: true, is_verified: true },
    { website_id: website.id, hostname: `${slug}.example.com`, is_primary: false, is_verified: false },
  ], 'id');

  // ---- room types, rooms, inventory, rates ------------------------------
  const roomTypeCount = 2 + Math.floor(rand(index + 13) * 3); // 2–4 types

  for (let t = 0; t < roomTypeCount; t++) {
    const template_ = ROOM_TEMPLATES[t];
    const price = Math.round((basePrice * template_.multiplier) / 50) * 50;
    const discount = rand(index + t + 21) > 0.65 ? 10 : 0;

    const { data: roomType, error: rtError } = await db
      .from('room_types')
      .insert({
        hotel_id: hotel.id,
        name: template_.name,
        slug: slugify(template_.name),
        description: template_.description,
        bed_type: template_.bed,
        room_size_sqft: template_.size,
        max_adults: template_.adults,
        max_children: template_.children,
        max_occupancy: template_.occupancy,
        extra_bed_allowed: t > 0,
        extra_bed_price: 800,
        base_price: price,
        discount_percent: discount,
        cancellation_policy: 'Free cancellation up to 48 hours before check-in.',
        is_refundable: true,
        is_active: true,
        sort_order: t,
      })
      .select('id')
      .single();

    if (rtError) throw new Error(`room type ${index}/${t}: ${rtError.message}`);

    await insert(
      'room_images',
      Array.from({ length: 3 }, (_, i) => ({
        room_type_id: roomType.id,
        url: photo(`${slug}-room-${t}-${i}`, 900, 675),
        alt_text: `${template_.name} at ${name}`,
        is_cover: i === 0,
        sort_order: i,
      })),
    );

    await insert(
      'room_amenities',
      template_.amenities.map((aName, i) => ({
        room_type_id: roomType.id,
        name: aName,
        sort_order: i,
      })),
    );

    // Physical rooms — 4 to 10 units per type.
    const unitCount = 4 + Math.floor(rand(index + t + 31) * 7);
    await insert(
      'rooms',
      Array.from({ length: unitCount }, (_, i) => ({
        hotel_id: hotel.id,
        room_type_id: roomType.id,
        room_number: `${t + 1}${String(i + 1).padStart(2, '0')}`,
        floor: String(t + 1),
        status: 'AVAILABLE',
      })),
    );

    // Inventory for the next N nights.
    const { error: invError } = await db.rpc('ensure_room_inventory', {
      p_room_type_id: roomType.id,
      p_from: isoDate(0),
      p_to: isoDate(INVENTORY_DAYS),
      p_total_rooms: unitCount,
    });
    if (invError) throw new Error(`inventory ${index}/${t}: ${invError.message}`);

    // Weekend uplift: Friday and Saturday nights cost more.
    const rates: { hotel_id: string; room_type_id: string; stay_date: string; price: number }[] = [];
    for (let d = 0; d < INVENTORY_DAYS; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const day = date.getDay();
      const uplift = day === 5 || day === 6 ? 1.25 : day === 0 ? 1.1 : 1;
      if (uplift === 1) continue; // weekday nights fall back to base_price
      rates.push({
        hotel_id: hotel.id,
        room_type_id: roomType.id,
        stay_date: date.toISOString().slice(0, 10),
        price: Math.round((price * uplift) / 50) * 50,
      });
    }

    for (let i = 0; i < rates.length; i += 500) {
      const { error: rateError } = await db
        .from('room_prices')
        .upsert(rates.slice(i, i + 500), { onConflict: 'room_type_id,stay_date' });
      if (rateError) throw new Error(`rates ${index}/${t}: ${rateError.message}`);
    }
  }

  // ---- transport --------------------------------------------------------
  const { data: service } = await db
    .from('transport_services')
    .insert({
      hotel_id: hotel.id,
      name: 'Hotel Cab Service',
      vehicle_type: pick(['Sedan', 'SUV', 'Tempo Traveller'], index),
      seat_capacity: pick([4, 6, 12], index),
      driver_name: pick(['Ramesh', 'Suresh', 'Imran', 'Joseph'], index),
      driver_phone: `+91 98${String(100000 + index * 13).slice(0, 6)}`,
      status: 'ACTIVE',
    })
    .select('id, seat_capacity')
    .single();

  for (const [routeName, pickup, drop, km, minutes, base, perSeat] of TRANSPORT_ROUTES) {
    const { data: route } = await db
      .from('transport_routes')
      .insert({
        hotel_id: hotel.id,
        name: routeName,
        pickup_location: pickup,
        drop_location: `${city} ${drop}`,
        distance_km: km,
        duration_minutes: minutes,
        base_price: base,
        price_per_seat: perSeat,
        is_active: true,
      })
      .select('id')
      .single();

    if (!route) continue;

    // A departure each morning and evening for the next 60 days.
    const slots: Record<string, unknown>[] = [];
    for (let d = 0; d < 60; d++) {
      for (const time of ['08:00', '17:00']) {
        slots.push({
          hotel_id: hotel.id,
          route_id: route.id,
          service_id: service?.id ?? null,
          depart_date: isoDate(d),
          depart_time: time,
          seat_capacity: service?.seat_capacity ?? 6,
          status: 'ACTIVE',
        });
      }
    }

    for (let i = 0; i < slots.length; i += 500) {
      await db.from('transport_slots').insert(slots.slice(i, i + 500));
    }
  }

  // ---- offers & reviews -------------------------------------------------
  await insert('offers', [
    {
      hotel_id: hotel.id,
      title: 'Stay 3 nights, save 15%',
      description: 'Book three nights or more and receive 15% off the room rate.',
      offer_type: 'PERCENTAGE',
      discount_percent: 15,
      valid_until: isoDate(180),
      is_active: true,
      sort_order: 0,
    },
    {
      hotel_id: hotel.id,
      title: 'Breakfast on us',
      description: 'Complimentary breakfast for two on Deluxe rooms and above.',
      offer_type: 'SEASONAL',
      discount_amount: 800,
      valid_until: isoDate(90),
      is_active: true,
      sort_order: 1,
    },
  ]);

  const reviewCount = 3 + Math.floor(rand(index + 41) * 4);
  await insert(
    'reviews',
    Array.from({ length: reviewCount }, (_, i) => {
      const [rating, title, comment] = REVIEW_SEEDS[(index + i) % REVIEW_SEEDS.length];
      return {
        hotel_id: hotel.id,
        booking_id: null, // seeded reviews bypass the eligibility trigger
        customer_id: null,
        author_name: pick(GUEST_NAMES, index + i),
        rating,
        title,
        comment,
        cleanliness_rating: Math.min(5, Number(rating) + (rand(index + i) > 0.5 ? 0 : -1)),
        service_rating: Number(rating),
        location_rating: Math.min(5, Number(rating) + 1),
        value_rating: Number(rating),
        status: 'APPROVED',
        created_at: new Date(Date.now() - (i + 1) * 9 * 86_400_000).toISOString(),
      };
    }),
  );

  return { name: hotel.name, slug };
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`AQOSS seeder → ${SUPABASE_URL}`);

  if (RESET) await reset();

  await seedCoupons();

  console.log(`Creating ${COUNT} hotels with ${INVENTORY_DAYS} nights of inventory each…`);

  for (let i = 0; i < COUNT; i++) {
    const hotel = await seedHotel(i);
    const n = String(i + 1).padStart(2, ' ');
    console.log(`  ${n}/${COUNT}  ${hotel.name}  →  http://${hotel.slug}.localhost:3000`);
  }

  console.log('\nDone.');
  console.log('Visit any hotel at http://<slug>.localhost:3000');
  console.log('Set DEFAULT_WEBSITE_SLUG in .env.local to serve one of them on plain localhost:3000.');
}

main().catch((err) => {
  console.error('\nSeeding failed:', err.message);
  process.exit(1);
});
