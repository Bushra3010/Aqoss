/**
 * Column defaults, generated from supabase/migrations by
 * scripts/generate-demo-defaults.ts — do not edit by hand; run
 * `npm run demo:defaults` after a migration changes a default.
 *
 * Postgres fills an omitted column from its default; the demo query engine
 * applies these on insert so rows look the same either way (a notification
 * without `state` once crashed the Notifications page).
 */

/** Marker for `default now()`, resolved at insert time. */
export const NOW = Symbol('now');

type Default = string | number | boolean | null | typeof NOW | Record<string, never> | never[];

const DEFAULTS: Record<string, Record<string, Default>> = {
  "profiles": {
    "country": "India",
    "is_admin": false,
    "is_active": true,
    "marketing_optin": false,
    "metadata": {},
    "created_at": NOW,
    "updated_at": NOW
  },
  "roles": {
    "is_system": false,
    "created_at": NOW,
    "updated_at": NOW
  },
  "permissions": {
    "created_at": NOW
  },
  "admin_users": {
    "hotel_scope": [],
    "is_active": true,
    "created_at": NOW,
    "updated_at": NOW
  },
  "hotels": {
    "status": "DRAFT",
    "country": "India",
    "check_in_time": "14:00",
    "check_out_time": "11:00",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "tax_percent": 12,
    "highlights": "{}",
    "metadata": {},
    "created_at": NOW,
    "updated_at": NOW
  },
  "hotel_amenities": {
    "sort_order": 0,
    "created_at": NOW
  },
  "hotel_images": {
    "is_cover": false,
    "sort_order": 0,
    "created_at": NOW
  },
  "hotel_policies": {
    "sort_order": 0,
    "created_at": NOW,
    "updated_at": NOW
  },
  "hotel_nearby_places": {
    "sort_order": 0,
    "created_at": NOW
  },
  "website_templates": {
    "is_active": true,
    "created_at": NOW
  },
  "websites": {
    "status": "DRAFT",
    "primary_color": "#0F766E",
    "accent_color": "#F59E0B",
    "robots_indexable": true,
    "content": {},
    "settings": {},
    "created_at": NOW,
    "updated_at": NOW
  },
  "website_domains": {
    "is_primary": false,
    "is_verified": false,
    "created_at": NOW
  },
  "website_settings": {
    "value": "null",
    "updated_at": NOW
  },
  "room_types": {
    "max_adults": 2,
    "max_children": 0,
    "max_occupancy": 2,
    "extra_bed_allowed": false,
    "extra_bed_price": 0,
    "discount_percent": 0,
    "is_refundable": true,
    "is_active": true,
    "sort_order": 0,
    "metadata": {},
    "created_at": NOW,
    "updated_at": NOW
  },
  "room_images": {
    "is_cover": false,
    "sort_order": 0,
    "created_at": NOW
  },
  "room_amenities": {
    "sort_order": 0
  },
  "rooms": {
    "status": "AVAILABLE",
    "created_at": NOW,
    "updated_at": NOW
  },
  "room_inventory": {
    "total_rooms": 0,
    "blocked_rooms": 0,
    "booked_rooms": 0,
    "is_closed": false,
    "updated_at": NOW
  },
  "room_prices": {
    "min_nights": 1,
    "updated_at": NOW
  },
  "booking_holds": {
    "created_at": NOW
  },
  "bookings": {
    "adults": 1,
    "children": 0,
    "rooms_count": 1,
    "status": "PENDING",
    "payment_status": "PENDING",
    "currency": "INR",
    "room_subtotal": 0,
    "extra_services_total": 0,
    "transport_total": 0,
    "discount_total": 0,
    "coupon_discount": 0,
    "tax_total": 0,
    "total_amount": 0,
    "amount_paid": 0,
    "amount_refunded": 0,
    "price_breakdown": {},
    "source": "WEBSITE",
    "created_at": NOW,
    "updated_at": NOW
  },
  "booking_rooms": {
    "rooms": 1,
    "adults": 1,
    "children": 0,
    "nightly_rates": [],
    "subtotal": 0,
    "discount": 0,
    "tax": 0,
    "total": 0,
    "created_at": NOW
  },
  "booking_guests": {
    "is_child": false,
    "created_at": NOW
  },
  "booking_status_history": {
    "created_at": NOW
  },
  "payments": {
    "provider": "mock",
    "tax": 0,
    "discount": 0,
    "currency": "INR",
    "status": "PENDING",
    "raw_response": {},
    "created_at": NOW,
    "updated_at": NOW
  },
  "refunds": {
    "status": "PENDING",
    "raw_response": {},
    "created_at": NOW
  },
  "invoices": {
    "currency": "INR",
    "subtotal": 0,
    "discount": 0,
    "tax": 0,
    "total": 0,
    "line_items": [],
    "issued_at": NOW,
    "created_at": NOW
  },
  "transport_services": {
    "amenities": "{}",
    "status": "ACTIVE",
    "created_at": NOW,
    "updated_at": NOW
  },
  "transport_routes": {
    "base_price": 0,
    "price_per_seat": 0,
    "is_active": true,
    "sort_order": 0,
    "created_at": NOW,
    "updated_at": NOW
  },
  "transport_slots": {
    "booked_seats": 0,
    "status": "ACTIVE",
    "created_at": NOW,
    "updated_at": NOW
  },
  "transport_bookings": {
    "amount": 0,
    "status": "PENDING",
    "created_at": NOW,
    "updated_at": NOW
  },
  "offers": {
    "offer_type": "PERCENTAGE",
    "is_active": true,
    "sort_order": 0,
    "created_at": NOW,
    "updated_at": NOW
  },
  "coupons": {
    "offer_type": "PERCENTAGE",
    "min_booking_amount": 0,
    "hotel_ids": [],
    "room_type_ids": [],
    "used_count": 0,
    "is_active": true,
    "created_at": NOW,
    "updated_at": NOW
  },
  "coupon_redemptions": {
    "amount": 0,
    "created_at": NOW
  },
  "reviews": {
    "status": "PENDING",
    "created_at": NOW,
    "updated_at": NOW
  },
  "review_images": {
    "sort_order": 0,
    "created_at": NOW
  },
  "notification_templates": {
    "is_active": true,
    "created_at": NOW,
    "updated_at": NOW
  },
  "notifications": {
    "payload": {},
    "state": "QUEUED",
    "scheduled_at": NOW,
    "attempts": 0,
    "created_at": NOW
  },
  "notification_logs": {
    "response": {},
    "created_at": NOW
  },
  "otp_codes": {
    "channel": "SMS",
    "purpose": "login",
    "attempts": 0,
    "created_at": NOW
  },
  "audit_logs": {
    "created_at": NOW
  },
  "platform_settings": {
    "value": "null",
    "category": "general",
    "is_secret": false,
    "updated_at": NOW
  },
  "booking_leads": {
    "status": "NEW",
    "created_at": NOW,
    "updated_at": NOW
  }
};

/** Fresh defaults for one new row of `table` (arrays and objects are never shared). */
export function defaultsFor(table: string): Record<string, unknown> {
  const now = new Date().toISOString();
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(DEFAULTS[table] ?? {})) {
    out[column] = value === NOW ? now : Array.isArray(value) ? [] : value && typeof value === 'object' ? {} : value;
  }
  return out;
}
