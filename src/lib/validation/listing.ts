import { z } from 'zod';
import { CANCELLATION_OPTIONS, NEARBY_TYPES, OWNERSHIP_TYPES, PROPERTY_TYPES, SMOKING_OPTIONS } from '@/lib/listing';

/** Form fields arrive as strings; blank means "not given". */
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const thisYear = new Date().getFullYear();

const propertyTypeKeys = PROPERTY_TYPES.map((t) => t.key) as [string, ...string[]];

export const basicInfoSchema = z.object({
  property_type: z.enum(propertyTypeKeys, { errorMap: () => ({ message: 'Choose the type of property.' }) }),
  name: z
    .string({ required_error: 'Enter the property name.' })
    .trim()
    .min(2, 'Enter the property name.')
    .max(160, 'Keep the name under 160 characters.'),
  star_rating: z.preprocess(blank, z.coerce.number().int().min(1).max(5).optional()),
  year_built: z.preprocess(blank, z.coerce.number().int().min(1800, 'Choose a year.').max(thisYear).optional()),
  accepting_since: z.preprocess(blank, z.coerce.number().int().min(1900, 'Choose a year.').max(thisYear).optional()),
  channel_manager: z.enum(['no', 'yes'], { errorMap: () => ({ message: 'Choose No or Yes.' }) }),
  channel_manager_name: optionalText(80),
  tagline: optionalText(200),
  description: optionalText(5000),
  email: z
    .string({ required_error: 'Enter the property’s email.' })
    .trim()
    .email('Enter a valid email address.'),
  phone: z
    .string({ required_error: 'Enter a phone number.' })
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, 'Enter a valid phone number.'),
})
  .refine((v) => v.channel_manager === 'no' || Boolean(v.channel_manager_name), {
    message: 'Which channel manager do you use?',
    path: ['channel_manager_name'],
  })
  .refine((v) => !v.year_built || !v.accepting_since || v.accepting_since >= v.year_built, {
    message: 'Bookings cannot start before the property was built.',
    path: ['accepting_since'],
  });

const nearbyTypeKeys = NEARBY_TYPES.map((t) => t.value) as [string, ...string[]];

export const nearbyPlaceSchema = z.object({
  place_type: z.enum(nearbyTypeKeys),
  name: z.string().trim().min(2, 'Name the place.').max(120),
  distance_km: z.preprocess(blank, z.coerce.number({ invalid_type_error: 'Enter the distance in km.' }).min(0).max(9999).optional()),
});

export const locationSchema = z.object({
  address_line1: z
    .string({ required_error: 'Enter the street address.' })
    .trim()
    .min(3, 'Enter the street address.')
    .max(200),
  address_line2: optionalText(200),
  city: z.string({ required_error: 'Enter the city.' }).trim().min(2, 'Enter the city.').max(80),
  state: z.string({ required_error: 'Enter the state.' }).trim().min(2, 'Enter the state.').max(80),
  postal_code: z
    .string({ required_error: 'Enter the PIN code.' })
    .trim()
    .regex(/^[0-9A-Za-z -]{3,10}$/, 'Enter a valid PIN code.'),
  country: z.preprocess(blank, z.string().trim().max(80).default('India')),
  google_maps_url: z.preprocess(blank, z.string().trim().url('Paste the full Google Maps link.').max(500).optional()),
  latitude: z.preprocess(blank, z.coerce.number({ invalid_type_error: 'Enter a latitude.' }).min(-90).max(90).optional()),
  longitude: z.preprocess(blank, z.coerce.number({ invalid_type_error: 'Enter a longitude.' }).min(-180).max(180).optional()),
});

const cancellationKeys = CANCELLATION_OPTIONS.map((o) => o.value) as [string, ...string[]];
const smokingKeys = SMOKING_OPTIONS.map((o) => o.value) as [string, ...string[]];
const yesNo = z.enum(['yes', 'no'], { errorMap: () => ({ message: 'Choose Yes or No.' }) }).transform((v) => v === 'yes');
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.');

export const policiesSchema = z.object({
  check_in_time: time,
  check_out_time: time,
  cancellation: z.enum(cancellationKeys),
  couples: yesNo,
  local_id: yesNo,
  child_free_age: z.coerce.number().int().min(0).max(12),
  extra_bed: yesNo,
  pets: yesNo,
  smoking: z.enum(smokingKeys),
  other: z.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().max(2000, 'Keep other rules under 2000 characters.')),
});

const ownershipKeys = OWNERSHIP_TYPES.map((o) => o.value) as [string, ...string[]];
const upper = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, '').toUpperCase() : v);

export const financeSchema = z.object({
  legal_name: z
    .string({ required_error: 'Enter the registered name.' })
    .trim()
    .min(2, 'Enter the registered name.')
    .max(160),
  ownership_type: z.enum(ownershipKeys, { errorMap: () => ({ message: 'Choose the type of ownership.' }) }),
  pan: z.preprocess(upper, z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid 10-character PAN, like ABCDE1234F.')),
  gstin: z.preprocess(
    (v) => blank(upper(v)),
    z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN.').optional(),
  ),
  bank_account_name: z
    .string({ required_error: 'Enter the account holder’s name.' })
    .trim()
    .min(2, 'Enter the account holder’s name.')
    .max(160),
  bank_account_number: z.preprocess(
    (v) => (typeof v === 'string' ? v.replace(/\s+/g, '') : v),
    z.string().regex(/^[0-9]{9,18}$/, 'Enter the account number (9 to 18 digits).'),
  ),
  bank_ifsc: z.preprocess(upper, z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid 11-character IFSC, like HDFC0001234.')),
  bank_name: optionalText(120),
})
  .refine((v) => !v.gstin || v.gstin.slice(2, 12) === v.pan, {
    message: 'The GSTIN should contain the PAN entered above.',
    path: ['gstin'],
  });

export const websiteSlugSchema = z
  .string({ required_error: 'Choose the website address.' })
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes.')
  .min(3, 'Use at least 3 characters.')
  .max(63, 'Keep it under 63 characters.');

/** Turn a zod error into one message per field, keyed by input name. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** An owner signing up on the website to list their property. */
export const ownerSignupSchema = z.object({
  property_type: z.enum(propertyTypeKeys, { errorMap: () => ({ message: 'Choose the type of property.' }) }),
  property_name: z
    .string({ required_error: 'Enter the property name.' })
    .trim()
    .min(2, 'Enter the property name.')
    .max(160, 'Keep the name under 160 characters.'),
  full_name: z.string({ required_error: 'Enter your name.' }).trim().min(2, 'Enter your name.').max(120),
  email: z.string({ required_error: 'Enter your email.' }).trim().toLowerCase().email('Enter a valid email address.'),
  mobile: z
    .string({ required_error: 'Enter your mobile number.' })
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, 'Enter a valid mobile number.'),
  password: z
    .string({ required_error: 'Choose a password.' })
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Use at most 72 characters.'),
});
