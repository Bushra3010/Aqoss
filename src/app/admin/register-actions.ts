'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { toApiError } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { createHotelRegistration } from '@/services/hotel-registration.service';

export type RegisterFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  name: z.string({ required_error: 'Enter your name.' }).trim().min(2, 'Enter your name.').max(120),
  hotel_name: z.string({ required_error: "Enter your hotel's name." }).trim().min(2, "Enter your hotel's name.").max(160),
  email: z.string({ required_error: 'Enter your email.' }).trim().toLowerCase().email('Enter a valid email.'),
  phone: z.string({ required_error: 'Enter a phone number.' }).trim().regex(/^[+0-9 ()-]{7,20}$/, 'Enter a valid phone number.'),
  city: z.string({ required_error: 'Enter the city.' }).trim().min(2, 'Enter the city.').max(80),
  address: z.string().trim().max(300).nullish(),
  rooms: z.coerce.number({ invalid_type_error: 'Enter a number.' }).int().min(1, 'At least 1 room.').max(10000).nullish(),
  message: z.string().trim().max(1500).nullish(),
});

/**
 * "Register your hotel" on the CRM sign-in page. Public: validated,
 * rate-limited, honeypot-guarded — and it only stores a request; a super
 * admin creates the hotel and its account after reviewing it.
 */
export async function submitHotelRegistration(_prev: RegisterFormState, formData: FormData): Promise<RegisterFormState> {
  try {
    // A field people never see; bots fill every input. Pretend success.
    if (String(formData.get('website_url') ?? '').trim()) return { ok: true };

    // At most a handful of registrations per address per hour.
    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || headers().get('x-real-ip') || 'unknown';
    if (!rateLimit(`hotel-registration:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 }).allowed) {
      return { error: 'Thanks — we already have your registration. Please try again later or call us.' };
    }

    const blank = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() === '' ? undefined : v ?? undefined);
    const parsed = schema.safeParse({
      name: blank(formData.get('name')),
      hotel_name: blank(formData.get('hotel_name')),
      email: blank(formData.get('email')),
      phone: blank(formData.get('phone')),
      city: blank(formData.get('city')),
      address: blank(formData.get('address')),
      rooms: blank(formData.get('rooms')),
      message: blank(formData.get('message')),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? '');
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      return { error: 'Please check the highlighted fields.', fieldErrors };
    }

    await createHotelRegistration(parsed.data);
    return { ok: true };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}
