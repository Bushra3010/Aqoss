import { z } from 'zod';

/** YYYY-MM-DD calendar date. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

export const availabilitySchema = z
  .object({
    hotel_id: z.string().uuid().optional(),
    check_in: isoDate,
    check_out: isoDate,
    adults: z.coerce.number().int().min(1).max(30).default(2),
    children: z.coerce.number().int().min(0).max(20).default(0),
    rooms: z.coerce.number().int().min(1).max(10).default(1),
  })
  .refine((v) => v.check_out > v.check_in, {
    message: 'Check-out must be after check-in',
    path: ['check_out'],
  });

export const holdSchema = z.object({
  room_type_id: z.string().uuid(),
  check_in: isoDate,
  check_out: isoDate,
  rooms: z.coerce.number().int().min(1).max(10).default(1),
});

export const bookingRoomSchema = z.object({
  room_type_id: z.string().uuid(),
  rooms: z.coerce.number().int().min(1).max(10),
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
});

export const guestSchema = z.object({
  name: z.string().trim().min(2, 'Please enter the guest name').max(120),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{7,20}$/, 'Please enter a valid phone number'),
  address: z.string().trim().max(500).optional(),
  special_requests: z.string().trim().max(1000).optional(),
  adults: z.coerce.number().int().min(1).max(30).default(1),
  children: z.coerce.number().int().min(0).max(20).default(0),
});

export const transportSelectionSchema = z.object({
  slot_id: z.string().uuid(),
  seats: z.coerce.number().int().min(1).max(50),
});

export const createBookingSchema = z
  .object({
    hotel_id: z.string().uuid(),
    website_id: z.string().uuid().nullish(),
    check_in: isoDate,
    check_out: isoDate,
    rooms: z.array(bookingRoomSchema).min(1, 'Select at least one room'),
    guest: guestSchema,
    guests: z
      .array(
        z.object({
          full_name: z.string().trim().min(2).max(120),
          age: z.coerce.number().int().min(0).max(120).optional(),
          is_child: z.boolean().optional(),
        }),
      )
      .max(20)
      .optional(),
    transport: z.array(transportSelectionSchema).max(5).optional(),
    coupon_code: z.string().trim().max(40).nullish(),
    hold_ids: z.array(z.string().uuid()).max(10).optional(),
    source: z.enum(['WEBSITE', 'CRM', 'PHONE', 'OTA']).default('WEBSITE'),
  })
  .refine((v) => v.check_out > v.check_in, {
    message: 'Check-out must be after check-in',
    path: ['check_out'],
  });

export const couponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  hotel_id: z.string().uuid(),
  amount: z.coerce.number().min(0),
  room_type_ids: z.array(z.string().uuid()).optional(),
});

export const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  comment: z.string().trim().max(3000).optional(),
  cleanliness_rating: z.coerce.number().min(1).max(5).optional(),
  service_rating: z.coerce.number().min(1).max(5).optional(),
  location_rating: z.coerce.number().min(1).max(5).optional(),
  value_rating: z.coerce.number().min(1).max(5).optional(),
  images: z.array(z.string().url()).max(6).optional(),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  mobile: z.string().trim().regex(/^[+]?[0-9\s-]{7,20}$/),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
  address: z.string().trim().max(500).optional(),
  date_of_birth: isoDate.optional(),
});

export const hotelSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80).optional(),
  tagline: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(5000).nullish(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).default('DRAFT'),
  star_rating: z.coerce.number().min(0).max(5).nullish(),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(30).nullish(),
  address_line1: z.string().trim().max(200).nullish(),
  city: z.string().trim().max(80).nullish(),
  state: z.string().trim().max(80).nullish(),
  country: z.string().trim().max(80).default('India'),
  postal_code: z.string().trim().max(20).nullish(),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
  check_in_time: z.string().default('14:00'),
  check_out_time: z.string().default('11:00'),
  tax_percent: z.coerce.number().min(0).max(100).default(12),
  currency: z.string().length(3).default('INR'),
});

export const websiteSchema = z.object({
  hotel_id: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only').max(80),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).default('DRAFT'),
  template_key: z.string().default('classic'),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0B4FD0'),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#15803D'),
  seo_title: z.string().trim().max(160).nullish(),
  seo_description: z.string().trim().max(320).nullish(),
  robots_indexable: z.boolean().default(true),
  domains: z.array(z.string().trim().max(253)).max(10).optional(),
});

export const inventorySchema = z.object({
  room_type_id: z.string().uuid(),
  from: isoDate,
  to: isoDate,
  total_rooms: z.coerce.number().int().min(0).max(999).optional(),
  price: z.coerce.number().min(0).optional(),
  is_closed: z.boolean().optional(),
});
