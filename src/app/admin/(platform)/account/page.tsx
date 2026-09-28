import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/shared';
import { ChangeMyPasswordForm, MyProfileForm } from '@/components/admin/StaffForms';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My account · AQOSS CRM' };

/** Your own details and password — for every staff member, whatever their role. */
export default async function AccountPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login?redirect=/admin/account');

  const { data: profile } = await createAdminSupabase()
    .from('profiles')
    .select('full_name, email, mobile')
    .eq('id', session.userId)
    .maybeSingle();

  return (
    <>
      <PageHeader title="My account" description="Your details and sign-in password." action={<Badge tone="blue">{session.roleName}</Badge>} />
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">Your details</h2>
          <MyProfileForm fullName={profile?.full_name ?? null} mobile={profile?.mobile ?? null} email={profile?.email ?? session.email ?? ''} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Change password</h2>
          <p className="mb-4 text-sm text-slate-500">You&apos;ll need your current password.</p>
          <ChangeMyPasswordForm />
        </section>
      </div>
    </>
  );
}
