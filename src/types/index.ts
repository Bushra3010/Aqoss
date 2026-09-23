/**
 * Domain types for AQOSS Hotel.
 *
 * These describe the shapes the application actually passes around — they are
 * the contract between services, API routes and components, independent of the
 * generated Supabase row types.
 */

export type BookingStatus =
  | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING' | 'PAID' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export type WebsiteStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type HotelStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN' | 'DELETED';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'OTP' | 'WHATSAPP' | 'PUSH';

// ---------------------------------------------------------------------------
// Tenant resolution
// ---------------------------------------------------------------------------

export interface TenantContext {
  websiteId: string;
  websiteSlug: string;
  hotelId: string;
  hotelSlug: string;
  status: WebsiteStatus;
}

// ---------------------------------------------------------------------------
// Hotel & website
// ---------------------------------------------------------------------------

export interface HotelImage {
  id: string;
  url: string;
  alt_text: string | null;
  caption: string | null;
  is_cover: boolean;
  sort_order: number;
}

export interface HotelAmenity {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
  sort_order: number;
}

export interface HotelPolicy {
  id: string;
  policy_type: string;
  title: string;
  content: string;
  sort_order: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  place_type: string;
  distance_km: number | null;
  travel_time: string | null;
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  star_rating: number | null;
  status: HotelStatus;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  tax_percent: number;
  highlights: string[];
}

export interface Website {
  id: string;
  hotel_id: string;
  name: string;
  slug: string;
  status: WebsiteStatus;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  robots_indexable: boolean;
  content: Record<string, unknown>;
}

/** Everything a hotel website template needs to render, in one payload. */
export interface HotelSiteData {
  website: Website;
  hotel: Hotel;
  images: HotelImage[];
  amenities: HotelAmenity[];
  policies: HotelPolicy[];
  nearby: NearbyPlace[];
  roomTypes: RoomTypeSummary[];
  reviews: Review[];
  reviewSummary: { average: number; count: number };
  offers: Offer[];
}

// ---------------------------------------------------------------------------
// Rooms & availability
// ---------------------------------------------------------------------------

export interface RoomTypeSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bed_type: string | null;
  room_size_sqft: number | null;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  base_price: number;
  discount_percent: number;
  cancellation_policy: string | null;
  images: { url: string; alt_text: string | null; is_cover: boolean }[];
  amenities: { name: string; icon: string | null }[];
}

export interface NightlyRate {
  date: string;
  price: number;
}

/** One row returned by the `search_availability` database function. */
export interface AvailabilityResult {
  room_type_id: string;
  name: string;
  slug: string;
  description: string | null;
  bed_type: string | null;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  base_price: number;
  available_rooms: number;
  nights: number;
  nightly_rates: NightlyRate[];
  room_subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total_price: number;
  is_available: boolean;
}

export interface AvailabilitySearch {
  hotelId: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  adults: number;
  children: number;
  rooms: number;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PriceBreakdown {
  currency: string;
  nights: number;
  room_subtotal: number;
  extra_services_total: number;
  transport_total: number;
  discount_total: number;
  coupon_code: string | null;
  coupon_discount: number;
  taxable_amount: number;
  tax_percent: number;
  tax_total: number;
  total_amount: number;
  lines: PriceLine[];
}

export interface PriceLine {
  label: string;
  detail?: string;
  amount: number;
  kind: 'room' | 'transport' | 'service' | 'discount' | 'tax' | 'total';
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export interface BookingRoomRequest {
  room_type_id: string;
  rooms: number;
  adults: number;
  children: number;
}

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  address?: string;
  special_requests?: string;
  adults: number;
  children: number;
}

export interface TransportSelection {
  slot_id: string;
  seats: number;
}

export interface CreateBookingRequest {
  websiteId?: string | null;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  rooms: BookingRoomRequest[];
  guest: GuestDetails;
  guests?: { full_name: string; age?: number; is_child?: boolean }[];
  transport?: TransportSelection[];
  couponCode?: string | null;
  holdIds?: string[];
  source?: 'WEBSITE' | 'CRM' | 'PHONE' | 'OTA';
}

export interface Booking {
  id: string;
  reference: string;
  hotel_id: string;
  website_id: string | null;
  customer_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  rooms_count: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  currency: string;
  room_subtotal: number;
  transport_total: number;
  discount_total: number;
  coupon_discount: number;
  tax_total: number;
  total_amount: number;
  amount_paid: number;
  amount_refunded: number;
  price_breakdown: PriceBreakdown | Record<string, never>;
  created_at: string;
}

export interface BookingHold {
  id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  rooms: number;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// Transport, offers, reviews
// ---------------------------------------------------------------------------

export interface TransportRoute {
  id: string;
  name: string;
  pickup_location: string;
  drop_location: string;
  distance_km: number | null;
  duration_minutes: number | null;
  base_price: number;
  price_per_seat: number;
}

export interface TransportSlot {
  id: string;
  route_id: string;
  route?: TransportRoute;
  depart_date: string;
  depart_time: string;
  seat_capacity: number;
  booked_seats: number;
  available_seats: number;
  price: number;
  vehicle_type?: string | null;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  discount_percent: number | null;
  discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface CouponValidation {
  valid: boolean;
  discount: number;
  message: string;
  coupon_id: string | null;
}

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  admin_response: string | null;
  created_at: string;
  images?: { url: string }[];
}

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; details?: unknown };
