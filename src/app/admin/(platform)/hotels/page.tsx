import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { hotelPanelPath } from '@/lib/admin/hotel-panel';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';

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
    .select('id, name, slug, city, state, status, star_rating, created_at, websites (id), room_types (id)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (session!.hotelScope.length) query = query.in('id', session!.hotelScope);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`);

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const hotels = (data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Hotels"
        description="Every property in the platform. Open admin takes you into that hotel's own panel — bookings, leads, pricing, photos and reviews for it alone."
        action={
          can(session, 'hotels.write') ? (
            <Link href="/admin/hotels/new" className="btn-primary">Add hotel</Link>
          ) : null
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          className="input max-w-xs"
          placeholder="Search by name"
          defaultValue={searchParams.q ?? ''}
        />
        <select name="status" className="input max-w-[10rem]" defaultValue={searchParams.status ?? ''}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="submit" className="btn-outline">Filter</button>
      </form>

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
              <p className="text-xs text-slate-400">/{hotel.slug}</p>
            </Td>
            <Td>{[hotel.city, hotel.state].filter(Boolean).join(', ') || '—'}</Td>
            <Td><StatusBadge status={hotel.status} /></Td>
            <Td>{hotel.websites?.length ?? 0}</Td>
            <Td>{hotel.room_types?.length ?? 0}</Td>
            <Td align="right">
              <span className="flex items-center justify-end gap-4 whitespace-nowrap">
                <Link href={`/admin/hotels/${hotel.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Edit
                </Link>
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
