'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AppError } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { listingPath } from '@/lib/listing';
import { createServerSupabase } from '@/lib/supabase/server';
import { fieldErrorsOf, ownerSignupSchema } from '@/lib/validation/listing';
import { registerOwner } from '@/services/listing.service';

export type RegisterFormState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * "List your property" on the website. Public: validated, rate-limited and
 * honeypot-guarded. Creates the owner's login, a draft property scoped to
 * them, signs them in and opens the listing. Nothing goes live until AQOSS
 * approves it (`listings.publish`).
 */
export async function registerPropertyOwner(_prev: RegisterFormState, formData: FormData): Promise<RegisterFormState> {
  let hotelId: string;
  try {
    // A field people never see; bots fill every input.
    if (String(formData.get('website_url') ?? '').trim()) return { error: 'Please try again.' };

    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || headers().get('x-real-ip') || 'unknown';
    if (!rateLimit(`owner-signup:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 }).allowed) {
      return { error: 'Too many sign-ups from this connection. Please try again in an hour, or call us.' };
    }

    const parsed = ownerSignupSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { error: 'Please check the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };

    ({ hotelId } = await registerOwner(parsed.data));

    const { error } = await createServerSupabase().auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      // The account exists; only the automatic sign-in failed.
      return { error: 'Your account is ready, but we could not sign you in. Please sign in to continue your listing.' };
    }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error('[aqoss] owner sign-up failed', err);
    return { error: 'We could not create your account. Please try again.' };
  }
  revalidatePath('/admin', 'layout');
  redirect(listingPath(hotelId, 'basic-info'));
}
