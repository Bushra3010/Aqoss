import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings · AQOSS CRM' };

/** Platform settings (PRD §42, §50). */
export default async function SettingsPage() {
  const session = await getAdminSession();
  if (!can(session, 'settings.write')) return <NoAccess />;

  const { data } = await createAdminSupabase()
    .from('platform_settings')
    .select('key, value, category')
    .eq('is_secret', false)
    .order('category')
    .order('key');

  return (
    <>
      <PageHeader title="Settings" description="Platform-wide configuration, editable without a deploy." />

      <section className="card mb-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Environment</h2>
        <p className="mt-1 text-xs text-slate-500">
          These come from environment variables and are not editable here — secrets never live in
          the database.
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Payment provider" value={env.paymentProvider} />
          <Row label="Email provider" value={env.emailProvider} />
          <Row label="SMS provider" value={env.smsProvider} />
          <Row label="WhatsApp provider" value={env.whatsappProvider} />
          <Row label="Booking hold" value={`${env.bookingHoldMinutes} minutes`} />
          <Row label="Root domain" value={env.rootDomain} />
        </dl>
      </section>

      <SettingsForm settings={(data ?? []) as { key: string; value: unknown; category: string }[]} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
