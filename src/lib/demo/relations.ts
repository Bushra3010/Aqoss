/**
 * Foreign-key map for the demo query engine.
 *
 * PostgREST infers embeds from the database's foreign keys. There is no
 * database here, so the same relationships are declared explicitly.
 *
 *   'one'  — parent[fk] points at child.id   (a booking's hotel)
 *   'many' — child[fk] points at parent.id   (a hotel's room types)
 */

export interface Relation {
  table: string;
  type: 'one' | 'many';
  fk: string;
}

export const RELATIONS: Record<string, Record<string, Relation>> = {
  hotels: {
    websites: { table: 'websites', type: 'many', fk: 'hotel_id' },
    room_types: { table: 'room_types', type: 'many', fk: 'hotel_id' },
    rooms: { table: 'rooms', type: 'many', fk: 'hotel_id' },
    hotel_images: { table: 'hotel_images', type: 'many', fk: 'hotel_id' },
    hotel_amenities: { table: 'hotel_amenities', type: 'many', fk: 'hotel_id' },
    hotel_policies: { table: 'hotel_policies', type: 'many', fk: 'hotel_id' },
    hotel_nearby_places: { table: 'hotel_nearby_places', type: 'many', fk: 'hotel_id' },
    reviews: { table: 'reviews', type: 'many', fk: 'hotel_id' },
    offers: { table: 'offers', type: 'many', fk: 'hotel_id' },
  },

  websites: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    website_templates: { table: 'website_templates', type: 'one', fk: 'template_id' },
    website_domains: { table: 'website_domains', type: 'many', fk: 'website_id' },
    website_settings: { table: 'website_settings', type: 'many', fk: 'website_id' },
  },

  website_domains: {
    websites: { table: 'websites', type: 'one', fk: 'website_id' },
  },

  website_settings: {
    websites: { table: 'websites', type: 'one', fk: 'website_id' },
  },

  room_types: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    room_images: { table: 'room_images', type: 'many', fk: 'room_type_id' },
    room_amenities: { table: 'room_amenities', type: 'many', fk: 'room_type_id' },
    rooms: { table: 'rooms', type: 'many', fk: 'room_type_id' },
  },

  rooms: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    room_types: { table: 'room_types', type: 'one', fk: 'room_type_id' },
  },

  room_inventory: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    room_types: { table: 'room_types', type: 'one', fk: 'room_type_id' },
  },

  room_prices: {
    room_types: { table: 'room_types', type: 'one', fk: 'room_type_id' },
  },

  bookings: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    websites: { table: 'websites', type: 'one', fk: 'website_id' },
    profiles: { table: 'profiles', type: 'one', fk: 'customer_id' },
    booking_rooms: { table: 'booking_rooms', type: 'many', fk: 'booking_id' },
    booking_guests: { table: 'booking_guests', type: 'many', fk: 'booking_id' },
    booking_status_history: { table: 'booking_status_history', type: 'many', fk: 'booking_id' },
    payments: { table: 'payments', type: 'many', fk: 'booking_id' },
    invoices: { table: 'invoices', type: 'many', fk: 'booking_id' },
    refunds: { table: 'refunds', type: 'many', fk: 'booking_id' },
    transport_bookings: { table: 'transport_bookings', type: 'many', fk: 'booking_id' },
    reviews: { table: 'reviews', type: 'many', fk: 'booking_id' },
  },

  booking_rooms: {
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    room_types: { table: 'room_types', type: 'one', fk: 'room_type_id' },
  },

  payments: {
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    profiles: { table: 'profiles', type: 'one', fk: 'customer_id' },
  },

  refunds: {
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    payments: { table: 'payments', type: 'one', fk: 'payment_id' },
  },

  invoices: {
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
  },

  reviews: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    profiles: { table: 'profiles', type: 'one', fk: 'customer_id' },
    review_images: { table: 'review_images', type: 'many', fk: 'review_id' },
  },

  review_images: {
    reviews: { table: 'reviews', type: 'one', fk: 'review_id' },
  },

  admin_users: {
    profiles: { table: 'profiles', type: 'one', fk: 'profile_id' },
    roles: { table: 'roles', type: 'one', fk: 'role_id' },
  },

  roles: {
    role_permissions: { table: 'role_permissions', type: 'many', fk: 'role_id' },
  },

  role_permissions: {
    permissions: { table: 'permissions', type: 'one', fk: 'permission_id' },
    roles: { table: 'roles', type: 'one', fk: 'role_id' },
  },

  transport_services: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
  },

  transport_routes: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
  },

  transport_slots: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    transport_routes: { table: 'transport_routes', type: 'one', fk: 'route_id' },
    transport_services: { table: 'transport_services', type: 'one', fk: 'service_id' },
  },

  transport_bookings: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    transport_slots: { table: 'transport_slots', type: 'one', fk: 'slot_id' },
  },

  offers: {
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
  },

  coupons: {
    offers: { table: 'offers', type: 'one', fk: 'offer_id' },
  },

  coupon_redemptions: {
    coupons: { table: 'coupons', type: 'one', fk: 'coupon_id' },
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
  },

  notifications: {
    bookings: { table: 'bookings', type: 'one', fk: 'booking_id' },
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
  },

  notification_logs: {
    notifications: { table: 'notifications', type: 'one', fk: 'notification_id' },
  },

  audit_logs: {
    profiles: { table: 'profiles', type: 'one', fk: 'actor_id' },
    hotels: { table: 'hotels', type: 'one', fk: 'hotel_id' },
  },

  profiles: {
    bookings: { table: 'bookings', type: 'many', fk: 'customer_id' },
    admin_users: { table: 'admin_users', type: 'many', fk: 'profile_id' },
  },
};
