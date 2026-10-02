'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { registerSchema } from '@/lib/validation/schemas';
import { env } from '@/lib/env';
import { getSiteBase } from '@/lib/tenant';
import { siteHome } from '@/lib/site-url';
import { safeLocalPath } from '@/lib/safe-path';

/**
 * Customer authentication (PRD §11), built on Supabase Auth.
 *
 * These are server actions, so credentials are never handled in the browser
 * beyond the form post itself, and the session cookie is set server-side.
 */

export type AuthState = { error?: string; success?: string };

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
    return { error: parsed.error.errors[0]?.message ?? 'Please check the details you entered.' };
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

  const supabase = createServerSupabase();
  const origin = headers().get('origin') ?? env.appUrl;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always the same answer, whether or not the address exists.
  return { success: 'If that address is registered, a reset link is on its way.' };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'Use at least 8 characters.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(siteHome(getSiteBase()));
}
