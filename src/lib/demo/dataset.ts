/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory rows are untyped by design; see src/lib/demo/README */
/**
 * Demo dataset — the same shapes the Supabase schema defines, generated in
 * memory so the platform runs with no database at all.
 *
 * Everything is deterministic: the same slugs, prices and availability on every
 * boot, so a URL you note down keeps working. State lives for the life of the
 * server process, so bookings you make are real until you restart.
 */

import { randomUUID } from 'node:crypto';

export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

const CITIES: [string, string, number, number][] = [
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
];

const PREFIXES = ['The', 'Hotel', 'Grand', 'Royal', 'Casa', 'Villa', 'The', 'Hotel'];
const NAMES = [
  'Serenity', 'Orchid', 'Marigold', 'Aravalli', 'Bluebell', 'Palm Grove', 'Cinnamon',
  'Sandalwood', 'Monsoon', 'Lakeview', 'Hillcrest', 'Sunrise', 'Heritage', 'Meridian',
  'Coral', 'Banyan', 'Peacock', 'Riverstone', 'Emerald', 'Saffron', 'Mango Tree',
  'Whitewater', 'Old Town', 'Silver Oak', 'Lotus', 'Tamarind',
];
const SUFFIXES = ['Resort', 'Residency', 'Retreat', 'Inn', 'Suites', 'Palace', 'Stay', 'House'];

const HOTEL_AMENITIES: [string, string][] = [
  ['Free Wi-Fi', 'general'], ['Swimming pool', 'wellness'], ['Spa', 'wellness'],
  ['Fitness centre', 'wellness'], ['Restaurant', 'food'], ['Room service', 'food'],
  ['Bar', 'food'], ['Free parking', 'general'], ['Airport shuttle', 'transport'],
  ['24-hour front desk', 'general'], ['Laundry service', 'general'],
  ['Business centre', 'general'], ['Garden', 'general'], ['Terrace', 'general'],
];

const ROOM_TEMPLATES = [
  {
    name: 'Standard Room', bed: '1 Queen Bed', adults: 2, children: 1, occupancy: 3,
    size: 220, multiplier: 1,
    amenities: ['Free Wi-Fi', 'Air conditioning', 'Flat-screen TV', 'Tea/coffee maker'],
    description:
      'A comfortable room with everything you need for a short stay, including a work desk and a private bathroom with complimentary toiletries.',
  },
  {
    name: 'Deluxe Room', bed: '1 King Bed', adults: 2, children: 2, occupancy: 4,
    size: 320, multiplier: 1.45,
    amenities: ['Free Wi-Fi', 'Breakfast included', 'Room service', 'Mini bar', 'Balcony'],
    description:
      'A generously sized room with a king bed, a seating area and a private balcony. Breakfast for two is included every morning.',
  },
  {
    name: 'Executive Suite', bed: '1 King Bed + Sofa', adults: 3, children: 2, occupancy: 5,
    size: 520, multiplier: 2.2,
    amenities: ['Free Wi-Fi', 'Breakfast included', 'Separate living room', 'Bathtub', 'Lounge access'],
    description:
      'A two-room suite with a separate living area, a large bathroom with a soaking tub, and access to the executive lounge.',
  },
  {
    name: 'Family Room', bed: '2 Queen Beds', adults: 4, children: 2, occupancy: 6,
    size: 450, multiplier: 1.8,
    amenities: ['Free Wi-Fi', 'Two queen beds', 'Extra bed on request', 'Kids welcome kit'],
    description:
      'Built for families: two queen beds, plenty of storage and space for an extra bed if you need one.',
  },
];

const POLICIES: [string, string, string][] = [
  ['check_in', 'Check-in & check-out', 'Check-in from 2:00 PM, check-out by 11:00 AM. Early check-in and late check-out are subject to availability and may be chargeable.'],
  ['cancellation', 'Cancellation policy', 'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours are charged one night. No-shows are charged the full stay.'],
  ['child', 'Child policy', 'Children under 6 stay free when sharing the existing bedding. Children 6 and over are charged as extra guests.'],
  ['extra_bed', 'Extra bed policy', 'One extra bed or mattress can be added to most rooms for an additional nightly charge, subject to availability.'],
  ['pet', 'Pet policy', 'Pets are not permitted, with the exception of registered service animals.'],
  ['smoking', 'Smoking policy', 'All rooms and indoor areas are strictly non-smoking. Designated smoking areas are available outdoors.'],
  ['id', 'ID requirements', 'A valid government-issued photo ID is required at check-in for every guest aged 18 and over. PAN cards are not accepted as ID proof.'],
  ['payment', 'Payment policy', 'The full amount is charged at the time of booking. Incidental charges are settled at check-out.'],
  ['damage', 'Damage policy', 'Guests are responsible for any damage to the room or its contents during their stay.'],
];

const NEARBY: [string, string, number, string][] = [
  ['airport', 'International Airport', 18, '35 min drive'],
  ['railway', 'Railway Station', 6, '15 min drive'],
  ['bus_stand', 'Central Bus Stand', 4, '10 min drive'],
  ['attraction', 'City Market', 2.5, '8 min drive'],
  ['attraction', 'Heritage Museum', 3.2, '10 min drive'],
];

const TRANSPORT_ROUTES: [string, string, string, number, number, number, number][] = [
  ['Hotel → Airport', 'Hotel lobby', 'International Airport', 18, 40, 400, 250],
  ['Hotel → Railway Station', 'Hotel lobby', 'Railway Station', 6, 20, 200, 120],
  ['Hotel → City Centre', 'Hotel lobby', 'City Centre', 4, 15, 150, 100],
];

const REVIEW_SEEDS: [number, string, string][] = [
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

/**
 * Every hotel uses the AQOSS palette, so the template looks the same on all of
 * them. The per-website colour columns still exist and still drive the render,
 * so a property can be re-branded from the CRM without touching code.
 */
const AQOSS_PRIMARY = '#0B4FD0';
const AQOSS_ACCENT = '#15803D';

// ---------------------------------------------------------------------------

const pick = <T,>(list: T[], i: number): T => list[i % list.length];
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const photo = (seed: string, w = 1200, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

/** Deterministic pseudo-random in [0,1), so every boot produces the same data. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------

export interface DatasetOptions {
  hotels: number;
  inventoryDays: number;
  transportDays: number;
}

export function buildDataset(options: DatasetOptions): Tables {
  const t: Tables = {
    profiles: [], roles: [], permissions: [], role_permissions: [], admin_users: [],
    hotels: [], hotel_amenities: [], hotel_images: [], hotel_policies: [], hotel_nearby_places: [],
    website_templates: [], websites: [], website_domains: [], website_settings: [],
    room_types: [], room_images: [], room_amenities: [], rooms: [],
    room_inventory: [], room_prices: [], booking_holds: [],
    bookings: [], booking_rooms: [], booking_guests: [], booking_status_history: [],
    payments: [], refunds: [], invoices: [],
    transport_services: [], transport_routes: [], transport_slots: [], transport_bookings: [],
    offers: [], coupons: [], coupon_redemptions: [],
    reviews: [], review_images: [], booking_leads: [],
    notification_templates: [], notifications: [], notification_logs: [], otp_codes: [],
    audit_logs: [], platform_settings: [],
  };

  seedRbac(t);
  seedPlatform(t);
  seedCoupons(t);

  for (let i = 0; i < options.hotels; i++) {
    seedHotel(t, i, options);
  }

  return t;
}

// ---------------------------------------------------------------------------

function seedRbac(t: Tables) {
  const permissionKeys: [string, string, string][] = [
    ['*', 'system', 'all'],
    ['dashboard.read', 'dashboard', 'read'],
    ['hotels.read', 'hotels', 'read'], ['hotels.write', 'hotels', 'write'],
    ['websites.read', 'websites', 'read'], ['websites.write', 'websites', 'write'],
    ['rooms.read', 'rooms', 'read'], ['rooms.write', 'rooms', 'write'],
    ['inventory.read', 'inventory', 'read'], ['inventory.write', 'inventory', 'write'],
    ['pricing.read', 'pricing', 'read'], ['pricing.write', 'pricing', 'write'],
    ['bookings.read', 'bookings', 'read'], ['bookings.write', 'bookings', 'write'],
    ['bookings.cancel', 'bookings', 'cancel'], ['bookings.checkin', 'bookings', 'checkin'],
    ['customers.read', 'customers', 'read'], ['customers.write', 'customers', 'write'],
    ['payments.read', 'payments', 'read'], ['payments.write', 'payments', 'write'],
    ['payments.refund', 'payments', 'refund'],
    ['transport.read', 'transport', 'read'], ['transport.write', 'transport', 'write'],
    ['offers.read', 'offers', 'read'], ['offers.write', 'offers', 'write'],
    ['reviews.read', 'reviews', 'read'], ['reviews.moderate', 'reviews', 'moderate'],
    ['reports.read', 'reports', 'read'],
    ['notifications.read', 'notifications', 'read'], ['notifications.write', 'notifications', 'write'],
    ['admins.read', 'admins', 'read'], ['admins.write', 'admins', 'write'],
    ['audit.read', 'audit', 'read'], ['settings.write', 'settings', 'write'],
    ['leads.read', 'leads', 'read'], ['leads.write', 'leads', 'write'],
  ];

  for (const [key, module, action] of permissionKeys) {
    t.permissions.push({ id: randomUUID(), key, module, action, description: null, created_at: now() });
  }

  const roleDefs: [string, string, string][] = [
    ['super_admin', 'Super Admin', 'Full access to every module'],
    ['booking_manager', 'Booking Manager', 'Bookings, customers, check-in and check-out'],
    ['hotel_manager', 'Hotel Manager', 'Hotels, rooms, pricing, availability and offers'],
    ['crm_staff', 'CRM Staff', 'Customers, bookings and reviews'],
    ['finance_staff', 'Finance Staff', 'Payments, refunds, revenue and reports'],
    ['property_manager', 'Property Manager', 'Runs one property end to end: bookings, rooms, pricing, website, payments and reviews'],
  ];

  for (const [key, name, description] of roleDefs) {
    t.roles.push({ id: randomUUID(), key, name, description, is_system: true, created_at: now(), updated_at: now() });
  }

  const grants: Record<string, string[]> = {
    super_admin: ['*'],
    booking_manager: [
      'dashboard.read', 'bookings.read', 'bookings.write', 'bookings.cancel', 'bookings.checkin',
      'customers.read', 'customers.write', 'rooms.read', 'inventory.read', 'payments.read',
      'transport.read', 'hotels.read', 'leads.read', 'leads.write',
    ],
    hotel_manager: [
      'dashboard.read', 'hotels.read', 'hotels.write', 'websites.read', 'websites.write',
      'rooms.read', 'rooms.write', 'inventory.read', 'inventory.write', 'pricing.read',
      'pricing.write', 'offers.read', 'offers.write', 'transport.read', 'transport.write',
      'bookings.read', 'reviews.read', 'reports.read',
    ],
    crm_staff: [
      'dashboard.read', 'customers.read', 'customers.write', 'bookings.read', 'bookings.write',
      'reviews.read', 'reviews.moderate', 'hotels.read', 'notifications.read',
      'leads.read', 'leads.write',
    ],
    finance_staff: [
      'dashboard.read', 'payments.read', 'payments.write', 'payments.refund', 'bookings.read',
      'customers.read', 'reports.read', 'hotels.read',
    ],
    // Only modules whose pages and actions honour hotel scope, so a login
    // limited to one property never sees another's customers or logs.
    property_manager: [
      'dashboard.read', 'hotels.read', 'hotels.write', 'websites.read', 'websites.write',
      'rooms.read', 'rooms.write', 'inventory.read', 'inventory.write', 'pricing.read',
      'pricing.write', 'bookings.read', 'bookings.write', 'bookings.cancel', 'bookings.checkin',
      'payments.read', 'payments.refund', 'transport.read', 'reviews.read', 'reviews.moderate',
      'reports.read', 'leads.read', 'leads.write', 'offers.read', 'offers.write',
    ],
  };

  for (const [roleKey, keys] of Object.entries(grants)) {
    const role = t.roles.find((r) => r.key === roleKey)!;
    for (const key of keys) {
      const permission = t.permissions.find((p) => p.key === key)!;
      t.role_permissions.push({ role_id: role.id, permission_id: permission.id });
    }
  }

  t.website_templates.push({
    id: randomUUID(), key: 'classic', name: 'Classic',
    description: 'The standard AQOSS hotel layout: overview, rooms, location, rules, reviews',
    preview_url: null, is_active: true, created_at: now(),
  });
}

function seedPlatform(t: Tables) {
  const settings: [string, unknown, string][] = [
    ['platform.name', 'AQOSS Hotels', 'general'],
    ['platform.support_email', 'support@aqoss.com', 'general'],
    ['booking.hold_minutes', 15, 'booking'],
    ['booking.reminder_hours_before', 24, 'booking'],
    ['payments.provider', 'mock', 'payments'],
    ['reviews.auto_approve', false, 'reviews'],
  ];

  for (const [key, value, category] of settings) {
    t.platform_settings.push({ key, value, category, is_secret: false, updated_by: null, updated_at: now() });
  }

  const templates: [string, string, string | null, string][] = [
    ['customer.registered', 'EMAIL', 'Welcome to {{hotel_name}}',
      'Hi {{customer_name}},\n\nWelcome to {{hotel_name}}. Your account is ready.'],
    ['booking.confirmed', 'EMAIL', 'Booking confirmed — {{booking_reference}}',
      'Hi {{customer_name}},\n\nYour stay at {{hotel_name}} is confirmed.\n\nBooking ID: {{booking_reference}}\nRoom: {{room_summary}}\nCheck-in: {{check_in}} from {{check_in_time}}\nCheck-out: {{check_out}} by {{check_out_time}}\nGuests: {{guests}}\n\nRoom total: {{room_subtotal}}\nTaxes: {{tax_total}}\nDiscount: {{discount_total}}\nTotal paid: {{total_amount}}\n\nAddress: {{hotel_address}}\nCancellation policy: {{cancellation_policy}}'],
    ['booking.confirmed', 'SMS', null,
      'Booking {{booking_reference}} confirmed at {{hotel_name}}. Check-in {{check_in}}. Total {{total_amount}}.'],
    ['booking.confirmed', 'WHATSAPP', null,
      'Your booking at {{hotel_name}} is confirmed. Ref {{booking_reference}}, {{check_in}} to {{check_out}}.'],
    ['payment.received', 'EMAIL', 'Payment receipt — {{booking_reference}}',
      'Hi {{customer_name}},\n\nWe received {{amount_paid}} for booking {{booking_reference}}.'],
    ['booking.reminder', 'EMAIL', 'Your stay at {{hotel_name}} starts soon',
      'Hi {{customer_name}},\n\nYour stay begins on {{check_in}}, check-in from {{check_in_time}}.'],
    ['booking.cancelled', 'EMAIL', 'Booking cancelled — {{booking_reference}}',
      'Hi {{customer_name}},\n\nBooking {{booking_reference}} at {{hotel_name}} has been cancelled.'],
    ['refund.processed', 'EMAIL', 'Refund processed — {{booking_reference}}',
      'Hi {{customer_name}},\n\nA refund of {{refund_amount}} for booking {{booking_reference}} has been processed.'],
    ['booking.completed', 'EMAIL', 'Thank you for staying with us',
      'Hi {{customer_name}},\n\nThank you for staying at {{hotel_name}}. Leave a review: {{review_url}}'],
  ];

  for (const [event_key, channel, subject, body] of templates) {
    t.notification_templates.push({
      id: randomUUID(), hotel_id: null, event_key, channel, subject, body,
      is_active: true, created_at: now(), updated_at: now(),
    });
  }
}

function seedCoupons(t: Tables) {
  const year = 365 * 86_400_000;
  const coupons = [
    { code: 'WELCOME10', description: '10% off your first stay', offer_type: 'PERCENTAGE', discount_percent: 10, discount_amount: null, max_discount: 2000, min_booking_amount: 2000, usage_limit: 1000, usage_limit_per_user: 1, valid_until: new Date(Date.now() + year).toISOString() },
    { code: 'FLAT1000', description: 'Flat ₹1,000 off bookings over ₹8,000', offer_type: 'FIXED', discount_percent: null, discount_amount: 1000, max_discount: null, min_booking_amount: 8000, usage_limit: 500, usage_limit_per_user: null, valid_until: new Date(Date.now() + year / 2).toISOString() },
    { code: 'EARLYBIRD15', description: '15% off when you book ahead', offer_type: 'EARLY_BIRD', discount_percent: 15, discount_amount: null, max_discount: 3000, min_booking_amount: 5000, usage_limit: null, usage_limit_per_user: null, valid_until: new Date(Date.now() + year).toISOString() },
    { code: 'LASTMINUTE20', description: '20% off last-minute stays', offer_type: 'LAST_MINUTE', discount_percent: 20, discount_amount: null, max_discount: 2500, min_booking_amount: 3000, usage_limit: null, usage_limit_per_user: null, valid_until: new Date(Date.now() + year / 4).toISOString() },
  ];

  for (const c of coupons) {
    t.coupons.push({
      id: randomUUID(), offer_id: null, ...c,
      hotel_ids: [], room_type_ids: [], used_count: 0, valid_from: null,
      is_active: true, created_by: null, created_at: now(), updated_at: now(),
    });
  }
}

// ---------------------------------------------------------------------------

function seedHotel(t: Tables, index: number, options: DatasetOptions) {
  const [city, state, lat, lng] = pick(CITIES, index);
  const name = `${pick(PREFIXES, index)} ${pick(NAMES, index)} ${pick(SUFFIXES, index + 3)}`;
  const slug = `${slugify(name)}-${slugify(city)}-${index + 1}`;
  const stars = 3 + Math.floor(rand(index + 1) * 3) * 0.5;
  const basePrice = 2200 + Math.floor(rand(index + 7) * 12) * 450;

  const hotelId = randomUUID();

  t.hotels.push({
    id: hotelId, name, slug,
    tagline: `A ${stars >= 4.5 ? 'luxury' : stars >= 4 ? 'premium' : 'comfortable'} stay in ${city}`,
    description:
      `${name} sits a short drive from the centre of ${city}, with ${stars >= 4.5 ? 'generously appointed' : 'bright, well-kept'} rooms and an unhurried atmosphere.\n\n` +
      `The property has a multi-cuisine restaurant, round-the-clock room service and a team that knows ${city} well. Whether you are here for a weekend or a fortnight, the staff can arrange transport, tours and early check-in on request.`,
    logo_url: photo(`logo-${slug}`, 200, 200),
    star_rating: stars, status: 'ACTIVE',
    email: `reservations@${slugify(name)}.example.com`,
    phone: `+91 ${90000 + index * 137} ${10000 + index * 71}`,
    alt_phone: null, website_url: null,
    address_line1: `${10 + index} ${pick(['MG Road', 'Station Road', 'Lake View Road', 'Beach Road', 'Mall Road'], index)}`,
    address_line2: null, city, state, country: 'India',
    postal_code: String(110001 + index * 37),
    latitude: Math.round((lat + (rand(index) - 0.5) * 0.05) * 1e6) / 1e6,
    longitude: Math.round((lng + (rand(index + 11) - 0.5) * 0.05) * 1e6) / 1e6,
    google_maps_url: null,
    check_in_time: '14:00:00', check_out_time: '11:00:00',
    currency: 'INR', timezone: 'Asia/Kolkata',
    tax_percent: basePrice >= 7500 ? 18 : 12,
    highlights: [
      'Free Wi-Fi throughout the property',
      'Complimentary breakfast on select rates',
      '24-hour front desk and room service',
      `${Math.round(2 + rand(index + 3) * 6)} km from the city centre`,
    ],
    metadata: {}, created_by: null,
    created_at: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
    updated_at: now(), archived_at: null,
  });

  for (let i = 0; i < 6; i++) {
    t.hotel_images.push({
      id: randomUUID(), hotel_id: hotelId, url: photo(`${slug}-${i}`),
      alt_text: `${name} — photo ${i + 1}`, caption: null,
      is_cover: i === 0, sort_order: i, created_at: now(),
    });
  }

  const amenityCount = 7 + Math.floor(rand(index + 5) * 7);
  HOTEL_AMENITIES.slice(0, amenityCount).forEach(([aName, category], i) => {
    t.hotel_amenities.push({
      id: randomUUID(), hotel_id: hotelId, name: aName, icon: null, category,
      sort_order: i, created_at: now(),
    });
  });

  POLICIES.forEach(([policy_type, title, content], i) => {
    t.hotel_policies.push({
      id: randomUUID(), hotel_id: hotelId, policy_type, title, content,
      sort_order: i, created_at: now(), updated_at: now(),
    });
  });

  NEARBY.forEach(([place_type, placeName, km, travel], i) => {
    t.hotel_nearby_places.push({
      id: randomUUID(), hotel_id: hotelId, name: `${city} ${placeName}`, place_type,
      distance_km: Math.round((km + rand(index + i) * 6) * 10) / 10,
      travel_time: travel, latitude: null, longitude: null,
      sort_order: i, created_at: now(),
    });
  });

  // ---- website ----------------------------------------------------------
  const websiteId = randomUUID();

  t.websites.push({
    id: websiteId, hotel_id: hotelId,
    template_id: t.website_templates[0].id,
    name: `${name} Website`, slug, status: 'ACTIVE',
    logo_url: photo(`logo-${slug}`, 200, 200), favicon_url: null,
    primary_color: AQOSS_PRIMARY, accent_color: AQOSS_ACCENT,
    seo_title: `${name} · Book direct in ${city}`,
    seo_description: `Book ${name} in ${city} directly. Live availability, best available rates and instant confirmation.`,
    og_image_url: photo(`${slug}-0`), canonical_url: null,
    robots_indexable: true, google_analytics_id: null,
    content: {}, settings: {},
    published_at: now(), created_by: null, created_at: now(), updated_at: now(),
  });

  t.website_domains.push(
    { id: randomUUID(), website_id: websiteId, hostname: `${slug}.localhost`, is_primary: true, is_verified: true, verified_at: now(), created_at: now() },
    { id: randomUUID(), website_id: websiteId, hostname: `${slug}.example.com`, is_primary: false, is_verified: false, verified_at: null, created_at: now() },
  );

  // ---- room types, rooms, inventory, rates ------------------------------
  const roomTypeCount = 2 + Math.floor(rand(index + 13) * 3);

  for (let ti = 0; ti < roomTypeCount; ti++) {
    const tpl = ROOM_TEMPLATES[ti];
    const price = Math.round((basePrice * tpl.multiplier) / 50) * 50;
    const discount = rand(index + ti + 21) > 0.65 ? 10 : 0;
    const roomTypeId = randomUUID();

    t.room_types.push({
      id: roomTypeId, hotel_id: hotelId, name: tpl.name, slug: slugify(tpl.name),
      description: tpl.description, bed_type: tpl.bed, room_size_sqft: tpl.size,
      max_adults: tpl.adults, max_children: tpl.children, max_occupancy: tpl.occupancy,
      extra_bed_allowed: ti > 0, extra_bed_price: 800,
      base_price: price, discount_percent: discount, tax_percent: null,
      cancellation_policy: 'Free cancellation up to 48 hours before check-in.',
      is_refundable: true, is_active: true, sort_order: ti,
      metadata: {}, created_at: now(), updated_at: now(),
    });

    for (let i = 0; i < 3; i++) {
      t.room_images.push({
        id: randomUUID(), room_type_id: roomTypeId,
        url: photo(`${slug}-room-${ti}-${i}`, 900, 675),
        alt_text: `${tpl.name} at ${name}`, is_cover: i === 0, sort_order: i, created_at: now(),
      });
    }

    tpl.amenities.forEach((aName, i) => {
      t.room_amenities.push({ id: randomUUID(), room_type_id: roomTypeId, name: aName, icon: null, sort_order: i });
    });

    const unitCount = 4 + Math.floor(rand(index + ti + 31) * 7);
    for (let i = 0; i < unitCount; i++) {
      t.rooms.push({
        id: randomUUID(), hotel_id: hotelId, room_type_id: roomTypeId,
        room_number: `${ti + 1}${String(i + 1).padStart(2, '0')}`,
        floor: String(ti + 1), status: 'AVAILABLE', notes: null,
        created_at: now(), updated_at: now(),
      });
    }

    for (let d = 0; d < options.inventoryDays; d++) {
      const stay_date = isoDate(d);
      const date = new Date(`${stay_date}T00:00:00`);
      const day = date.getDay();

      // A few nights are already partly sold, so availability is not uniform.
      const preBooked =
        rand(index * 31 + ti * 7 + d) > 0.78 ? Math.min(unitCount, 1 + Math.floor(rand(d + ti) * 3)) : 0;

      t.room_inventory.push({
        id: randomUUID(), hotel_id: hotelId, room_type_id: roomTypeId, stay_date,
        total_rooms: unitCount, blocked_rooms: 0, booked_rooms: preBooked,
        is_closed: false, updated_at: now(),
      });

      const uplift = day === 5 || day === 6 ? 1.25 : day === 0 ? 1.1 : 1;
      if (uplift !== 1) {
        t.room_prices.push({
          id: randomUUID(), hotel_id: hotelId, room_type_id: roomTypeId, stay_date,
          price: Math.round((price * uplift) / 50) * 50,
          discount_percent: null, min_nights: 1, updated_at: now(),
        });
      }
    }
  }

  // ---- transport --------------------------------------------------------
  const serviceId = randomUUID();
  const seatCapacity = pick([4, 6, 12], index);

  t.transport_services.push({
    id: serviceId, hotel_id: hotelId, name: 'Hotel Cab Service',
    vehicle_type: pick(['Sedan', 'SUV', 'Tempo Traveller'], index),
    vehicle_number: null, seat_capacity: seatCapacity,
    driver_name: pick(['Ramesh', 'Suresh', 'Imran', 'Joseph'], index),
    driver_phone: `+91 98${String(100000 + index * 13).slice(0, 6)}`,
    amenities: [], image_url: null, status: 'ACTIVE',
    created_at: now(), updated_at: now(),
  });

  for (const [routeName, pickup, drop, km, minutes, base, perSeat] of TRANSPORT_ROUTES) {
    const routeId = randomUUID();

    t.transport_routes.push({
      id: routeId, hotel_id: hotelId, name: routeName,
      pickup_location: pickup, drop_location: `${city} ${drop}`,
      distance_km: km, duration_minutes: minutes,
      base_price: base, price_per_seat: perSeat,
      is_active: true, sort_order: 0, created_at: now(), updated_at: now(),
    });

    for (let d = 0; d < options.transportDays; d++) {
      for (const time of ['08:00:00', '17:00:00']) {
        t.transport_slots.push({
          id: randomUUID(), hotel_id: hotelId, route_id: routeId, service_id: serviceId,
          depart_date: isoDate(d), depart_time: time,
          seat_capacity: seatCapacity, booked_seats: 0,
          price_override: null, status: 'ACTIVE',
          created_at: now(), updated_at: now(),
        });
      }
    }
  }

  // ---- offers & reviews -------------------------------------------------
  t.offers.push(
    {
      id: randomUUID(), hotel_id: hotelId, title: 'Stay 3 nights, save 15%',
      description: 'Book three nights or more and receive 15% off the room rate.',
      offer_type: 'PERCENTAGE', discount_percent: 15, discount_amount: null,
      max_discount: null, banner_url: null, valid_from: null, valid_until: isoDate(180),
      is_active: true, sort_order: 0, created_at: now(), updated_at: now(),
    },
    {
      id: randomUUID(), hotel_id: hotelId, title: 'Breakfast on us',
      description: 'Complimentary breakfast for two on Deluxe rooms and above.',
      offer_type: 'SEASONAL', discount_percent: null, discount_amount: 800,
      max_discount: null, banner_url: null, valid_from: null, valid_until: isoDate(90),
      is_active: true, sort_order: 1, created_at: now(), updated_at: now(),
    },
  );

  const reviewCount = 3 + Math.floor(rand(index + 41) * 4);
  for (let i = 0; i < reviewCount; i++) {
    const [rating, title, comment] = REVIEW_SEEDS[(index + i) % REVIEW_SEEDS.length];
    t.reviews.push({
      id: randomUUID(), hotel_id: hotelId, booking_id: null, customer_id: null,
      author_name: pick(GUEST_NAMES, index + i),
      rating, title, comment,
      cleanliness_rating: Math.min(5, rating + (rand(index + i) > 0.5 ? 0 : -1)),
      service_rating: rating, location_rating: Math.min(5, rating + 1), value_rating: rating,
      status: 'APPROVED', admin_response: null, responded_at: null, moderated_by: null,
      created_at: new Date(Date.now() - (i + 1) * 9 * 86_400_000).toISOString(),
      updated_at: now(),
    });
  }
}
