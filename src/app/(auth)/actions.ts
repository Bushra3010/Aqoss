'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { registerSchema } from '@/lib/validation/schemas';
import { env, isDemoMode } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { getSiteBase } from '@/lib/tenant';
import { siteHome } from '@/lib/site-url';
import { safeLocalPath } from '@/lib/safe-path';
import { emailDomainAcceptsMail } from '@/lib/email-domain';

/**
 * Customer authentication (PRD §11), built on Supabase Auth.
 *
 * These are server actions, so credentials are never handled in the browser
 * beyond the form post itself, and the session cookie is set server-side.
 */

export type AuthState = {
  error?: string;
  success?: string;
  /** Demo mode only: the reset link that would have been emailed. */
  demoLink?: string;
  /** The email address is not one that can receive mail; the form asks for another. */
  invalidEmail?: boolean;
};

const INVALID_EMAIL = 'We could not find that email address. Please enter a valid email address.';

/**
 * The same reset flow serves customers and CRM staff; `area` (a hidden field)
 * only decides which page the emailed link opens and where to go afterwards.
 */
function resetArea(formData: FormData) {
  return formData.get('area') === 'admin'
    ? { resetPage: '/admin/reset-password', home: '/admin' }
    : { resetPage: '/reset-password', home: '/dashboard' };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '/dashboard');

  if (!email || !password) return { error: 'Please enter your email and password.' };

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: do not reveal whether the address is registered.
    return { error: 'That email and password do not match. Please try again.' };
  }

  revalidatePath('/', 'layout');
  redirect(safeLocalPath(redirectTo, '/dashboard'));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    mobile: formData.get('mobile'),
    password: formData.get('password'),
    address: formData.get('address') || undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    if (issue?.path[0] === 'email') return { error: INVALID_EMAIL, invalidEmail: true };
    return { error: issue?.message ?? 'Please check the details you entered.' };
  }

  // Catch typos and made-up domains before Supabase sends a confirmation into the void.
  if (!(await emailDomainAcceptsMail(parsed.data.email))) {
    return { error: INVALID_EMAIL, invalidEmail: true };
  }

  const supabase = createServerSupabase();
  const origin = headers().get('origin') ?? env.appUrl;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: parsed.data.full_name, mobile: parsed.data.mobile },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // The profile row is created by a trigger; fill in the extra fields.
  if (data.user) {
    await createAdminSupabase()
      .from('profiles')
      .update({
        full_name: parsed.data.full_name,
        mobile: parsed.data.mobile,
        address_line1: parsed.data.address ?? null,
      })
      .eq('id', data.user.id);
  }

  if (!data.session) {
    return { success: 'Check your inbox to confirm your email address, then sign in.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Please enter your email address.' };

  // Each request sends an email: cap them per address and per caller.
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || headers().get('x-real-ip') || 'unknown';
  const window = { limit: 5, windowMs: 15 * 60 * 1000 };
  if (!rateLimit(`pw-reset:ip:${ip}`, window).allowed || !rateLimit(`pw-reset:email:${email.toLowerCase()}`, window).allowed) {
    return { error: 'Too many reset requests. Please wait a few minutes and try again.' };
  }

  const { resetPage } = resetArea(formData);
  const supabase = createServerSupabase();
  const origin = headers().get('origin') ?? env.appUrl;

  const { data } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${resetPage}`,
  });

  // Always the same answer, whether or not the address exists.
  const success = 'If that address is registered, a reset link is on its way.';
  if (isDemoMode) {
    const demoLink = (data as { demoLink?: string } | null)?.demoLink;
    return { success: `${success} (Demo mode sends no email.)`, demoLink };
  }
  return { success };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const { home } = resetArea(formData);

  if (password.length < 8) return { error: 'Use at least 8 characters.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The reset link signs you in; without that session there is nothing to update.
  if (!user) return { error: 'This reset link has expired. Please request a new one.' };

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect(home);
}

export async function signOut() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(siteHome(getSiteBase()));
}
