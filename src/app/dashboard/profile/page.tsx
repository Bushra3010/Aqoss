import type { Metadata } from 'next';
import { getUser } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ProfileForm } from '@/components/website/ProfileForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile' };

/** Profile and password (PRD §11, §12). */
export default async function ProfilePage() {
  const user = await getUser();

  const { data: profile } = await createAdminSupabase()
    .from('profiles')
    .select('full_name, email, mobile, address_line1, city, state, postal_code, date_of_birth')
    .eq('id', user!.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="section-title">Profile</h1>
      <ProfileForm
        profile={{
          full_name: profile?.full_name ?? '',
          email: profile?.email ?? user!.email ?? '',
          mobile: profile?.mobile ?? '',
          address_line1: profile?.address_line1 ?? '',
          city: profile?.city ?? '',
          state: profile?.state ?? '',
          postal_code: profile?.postal_code ?? '',
          date_of_birth: profile?.date_of_birth ?? '',
        }}
      />
    </div>
  );
}
