import type { Metadata } from 'next';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, NoAccess, StatTile } from '@/components/admin/shared';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Notifications · AQOSS CRM' };

const CHANNEL_ICONS = {
  EMAIL: Mail,
  SMS: Smartphone,
  OTP: Smartphone,
  WHATSAPP: MessageSquare,
  PUSH: Bell,
} as const;

const STATE_TONES: Record<string, string> = {
  QUEUED: 'bg-amber-50 text-amber-700',
  SENT: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-rose-50 text-rose-700',
  SKIPPED: 'bg-slate-100 text-slate-600',
};

/** Notification outbox and templates (PRD §20, §28). */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'notifications.read')) return <NoAccess />;

  const supabase = createAdminSupabase();

  let query = supabase
    .from('notifications')
    .select('id, event_key, channel, recipient, subject, body, state, scheduled_at, sent_at, attempts, last_error')
    .order('scheduled_at', { ascending: false })
    .limit(100);

  if (searchParams.state) query = query.eq('state', searchParams.state);

  const [{ data }, queued, sent, failed, { data: templates }] = await Promise.all([
    query,
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('state', 'QUEUED'),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('state', 'SENT'),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('state', 'FAILED'),
    supabase
      .from('notification_templates')
      .select('id, event_key, channel, subject, is_active')
      .order('event_key'),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Booking events queue here, then a worker delivers them. Templates are configurable per hotel."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile label="Queued" value={queued.count ?? 0} hint="Waiting to send" />
        <StatTile label="Sent" value={sent.count ?? 0} />
        <StatTile label="Failed" value={failed.count ?? 0} hint="After 3 attempts" />
      </div>

      <form className="mb-4 flex gap-2">
        <select name="state" className="input max-w-[12rem]" defaultValue={searchParams.state ?? ''}>
          <option value="">All states</option>
          {['QUEUED', 'SENT', 'FAILED', 'SKIPPED'].map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
        <button type="submit" className="btn-outline">Filter</button>
      </form>

      <ul className="space-y-2">
        {rows.map((row) => {
          const Icon = CHANNEL_ICONS[row.channel as keyof typeof CHANNEL_ICONS] ?? Bell;

          return (
            <li key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs font-medium text-slate-900">{row.event_key}</code>
                    <span className="text-xs text-slate-400">→ {row.recipient}</span>
                  </div>
                  {row.subject ? (
                    <p className="mt-1 text-sm font-medium text-slate-900">{row.subject}</p>
                  ) : null}
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-slate-500">
                    {row.body}
                  </p>
                  {row.last_error ? (
                    <p className="mt-1 text-xs text-rose-600">{row.last_error}</p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-1 text-xs font-medium',
                      STATE_TONES[row.state] ?? 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {row.state.toLowerCase()}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(row.sent_at ?? row.scheduled_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </li>
          );
        })}

        {rows.length === 0 ? (
          <li className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-base font-semibold text-slate-900">Nothing in the outbox</p>
            <p className="mt-1 text-sm text-slate-500">
              Confirm a booking and its notifications will appear here.
            </p>
          </li>
        ) : null}
      </ul>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Templates</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {((templates ?? []) as any[]).map((t) => {
          const Icon = CHANNEL_ICONS[t.channel as keyof typeof CHANNEL_ICONS] ?? Bell;
          return (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                <code className="truncate text-xs font-medium text-slate-900">{t.event_key}</code>
              </div>
              <p className="mt-1.5 truncate text-sm text-slate-600">{t.subject ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">
                {t.channel.toLowerCase()} · {t.is_active ? 'active' : 'inactive'}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
