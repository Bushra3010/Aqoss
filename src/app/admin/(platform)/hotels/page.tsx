import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { hotelPanelPath } from '@/lib/admin/hotel-panel';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { FilterForm } from '@/components/admin/FilterForm';
import { listingPath, propertyType } from '@/lib/listing';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hotels · AQOSS CRM' };

/** Hotel management (PRD §21). */
export default async function HotelsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'hotels.read')) return <NoAccess />;

  let query = createAdminSupabase()
    .from('hotels')
    .select('id, name, slug, city, state, status, star_rating, property_type, metadata, created_at, websites (id), room_types (id)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (session!.hotelScope.length) query = query.in('id', session!.hotelScope);
  // "Awaiting approval" is a draft whose owner has submitted the listing.
  const awaiting = searchParams.status === 'AWAITING';
  if (searchParams.status) query = query.eq('status', awaiting ? 'DRAFT' : searchParams.status);
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`);

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const submitted = (h: any) => Boolean(h.metadata?.listing?.submitted_at);
  const hotels = ((data ?? []) as any[]).filter((h) => !awaiting || submitted(h));

  return (
    <>
      <PageHeader
        title="Hotels & Properties"
        description="Every property in the platform. List property adds one with its free website; Open admin takes you into that hotel's own panel."
        action={
          can(session, 'hotels.write') && can(session, 'websites.write') && !session!.hotelScope.length ? (
            <Link href="/admin/hotels/new" className="btn-primary">List property</Link>
          ) : null
        }
      />

      <FilterForm className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          className="input max-w-xs"
          placeholder="Search by name"
          defaultValue={searchParams.q ?? ''}
        />
        <select name="status" className="input max-w-[10rem]" defaultValue={searchParams.status ?? ''}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="AWAITING">Awaiting approval</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </FilterForm>

      <Table
        headers={['Hotel', 'Location', 'Status', 'Websites', 'Room types', { label: '', align: 'right' }]}
        empty="No hotels match this filter."
      >
        {hotels.map((hotel) => (
          <tr key={hotel.id}>
            <Td>
              <Link href={`/admin/hotels/${hotel.id}`} className="font-medium text-slate-900 hover:underline">
                {hotel.name}
              </Link>
              <p className="text-xs text-slate-400">{propertyType(hotel.property_type)?.label ?? `/${hotel.slug}`}</p>
            </Td>
            <Td>{[hotel.city, hotel.state].filter(Boolean).join(', ') || '—'}</Td>
            <Td>
              {hotel.status === 'DRAFT' ? (
                <span className={submitted(hotel) ? 'badge bg-amber-100 text-amber-800' : 'badge bg-slate-100 text-slate-700'}>
                  {submitted(hotel) ? 'Awaiting approval' : 'Listing in progress'}
                </span>
              ) : (
                <StatusBadge status={hotel.status} />
              )}
            </Td>
            <Td>{hotel.websites?.length ?? 0}</Td>
            <Td>{hotel.room_types?.length ?? 0}</Td>
            <Td align="right">
              <span className="flex items-center justify-end gap-4 whitespace-nowrap">
                {hotel.status === 'DRAFT' && can(session, 'hotels.write') ? (
                  <Link href={listingPath(hotel.id, 'go-live')} className="text-sm font-semibold text-blue-700 hover:underline">
                    {submitted(hotel) && can(session, 'listings.publish') ? 'Review & publish' : 'Continue listing'}
                  </Link>
                ) : (
                  <Link href={`/admin/hotels/${hotel.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    Edit
                  </Link>
                )}
                <Link href={hotelPanelPath(hotel.slug)} className="btn-outline py-1.5 text-sm">
                  Open admin
                </Link>
              </span>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
