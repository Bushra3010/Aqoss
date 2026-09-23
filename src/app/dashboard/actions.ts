'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type ProfileState = { error?: string; success?: string };

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your name').max(120),
  mobile: z.string().trim().regex(/^[+]?[0-9\s-]{7,20}$/, 'Please enter a valid phone number'),
  address_line1: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  postal_code: z.string().trim().max(20).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

/** Update the signed-in customer's own profile (PRD §11). */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Please sign in to continue.' };

  const parsed = profileSchema.safeParse({
    full_name: formData.get('full_name'),
    mobile: formData.get('mobile'),
    address_line1: formData.get('address_line1') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    postal_code: formData.get('postal_code') || undefined,
    date_of_birth: formData.get('date_of_birth') || '',
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Please check the details you entered.' };
  }

  const { error } = await createAdminSupabase()
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      mobile: parsed.data.mobile,
      address_line1: parsed.data.address_line1 ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      postal_code: parsed.data.postal_code ?? null,
      date_of_birth: parsed.data.date_of_birth || null,
    })
    .eq('id', user.id);

  if (error) return { error: 'We could not save your profile. Please try again.' };

  revalidatePath('/dashboard/profile');
  return { success: 'Profile updated.' };
}

/** Change password for a signed-in customer. */
export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'Use at least 8 characters.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  return { success: 'Password changed.' };
}
