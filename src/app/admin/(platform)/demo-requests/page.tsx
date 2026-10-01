import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { DEMO_INTERESTS, listDemoRequests } from '@/services/demo-request.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { FilterForm } from '@/components/admin/FilterForm';
import { DemoRequestControls } from '@/components/admin/DemoRequestRow';
import { EmptyState, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Demo requests · AQOSS CRM' };

const LABELS = Object.fromEntries(DEMO_INTERESTS) as Record<string, string>;

/** "Book a demo" requests from the AQOSS website on the main domain. */
export default async function DemoRequestsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'demo_requests.read')) return <NoAccess />;

  const rows = await listDemoRequests(searchParams.status);
  const canWrite = can(session, 'demo_requests.write');

  return (
    <>
      <PageHeader title="Demo requests" description="Hotels that asked for a demo on the AQOSS website." />
      <FilterForm className="mb-4 flex gap-2">
        <select name="status" className="input max-w-[12rem]" defaultValue={searchParams.status ?? ''} aria-label="Status">
          <option value="">All</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="CLOSED">Closed</option>
        </select>
      </FilterForm>

      {rows.length ? (
        <div className="space-y-4">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{r.hotel_name}</p>
                  <p className="text-sm text-slate-600">
                    {r.name}
                    {r.city ? ` · ${r.city}` : ''}
                    {r.rooms ? ` · ${r.rooms} rooms` : ''}
                  </p>
                  <p className="mt-1 text-sm">
                    <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>
                    {' · '}
                    <a href={`tel:${r.phone}`} className="text-blue-600 hover:underline">{r.phone}</a>
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={r.status} />
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              {r.interests.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {r.interests.map((i) => (
                    <li key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{LABELS[i] ?? i}</li>
                  ))}
                </ul>
              ) : null}
              {r.message ? <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{r.message}</p> : null}
              {canWrite ? <DemoRequestControls id={r.id} status={r.status} notes={r.notes} /> : r.notes ? <p className="mt-3 text-sm text-slate-600">{r.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No demo requests yet" description="Requests from the Book demo form on the AQOSS website appear here." />
      )}
    </>
  );
}
