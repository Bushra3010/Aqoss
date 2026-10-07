import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminSession, can } from '@/lib/auth/session';
import { listHotelRegistrations } from '@/services/hotel-registration.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { FilterForm } from '@/components/admin/FilterForm';
import { HotelRegistrationControls } from '@/components/admin/HotelRegistrationRow';
import { EmptyState, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hotel registrations · AQOSS CRM' };

/**
 * "Register your hotel" requests from the CRM sign-in page. Approving one
 * grants nothing by itself: the hotel and its staff are added as usual.
 */
export default async function HotelRegistrationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'hotel_registrations.read')) return <NoAccess />;

  const rows = await listHotelRegistrations(searchParams.status);
  const canWrite = can(session, 'hotel_registrations.write');
  const canAddHotel = can(session, 'hotels.write');
  const canAddStaff = can(session, 'admins.write');

  return (
    <>
      <PageHeader
        title="Hotel registrations"
        description="Hotels that registered from the sign-in page. Approve one, then add the hotel and its staff account."
      />
      <FilterForm className="mb-4 flex gap-2">
        <select name="status" className="input max-w-[12rem]" defaultValue={searchParams.status ?? ''} aria-label="Status">
          <option value="">All</option>
          <option value="NEW">New</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
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
                    {r.city}
                    {r.rooms ? ` · ${r.rooms} rooms` : ''}
                    {r.address ? ` · ${r.address}` : ''}
                  </p>
                  <p className="mt-1 text-sm">
                    {r.name} ·{' '}
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
              {r.message ? <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{r.message}</p> : null}
              {r.status === 'APPROVED' && (canAddHotel || canAddStaff) ? (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {canAddHotel ? <Link href="/admin/hotels/new" className="font-semibold text-blue-600 hover:underline">Add the hotel →</Link> : null}
                  {canAddStaff ? <Link href="/admin/admins/new" className="font-semibold text-blue-600 hover:underline">Create their sign-in →</Link> : null}
                </p>
              ) : null}
              {canWrite ? (
                <HotelRegistrationControls id={r.id} status={r.status} notes={r.notes} />
              ) : r.notes ? (
                <p className="mt-3 text-sm text-slate-600">{r.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hotel registrations yet" description="Registrations from the sign-in page's Register your hotel form appear here." />
      )}
    </>
  );
}
