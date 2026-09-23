import Link from 'next/link';
import type { AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td } from '@/components/admin/shared';
import { Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

/**
 * Room types and their physical rooms (PRD §7, §9).
 *
 * In a hotel's own panel `hotelId` pins the list to that property, and
 * `panel` supplies links to its photos and pricing pages.
 */
export async function RoomsView({
  session,
  searchParams,
  hotelId,
  panel,
}: {
  session: AdminSession;
  searchParams: { hotel?: string };
  hotelId?: string;
  panel?: { imagesHref: (roomTypeId: string) => string; pricingHref: string; newHref?: string };
}) {
  const supabase = createAdminSupabase();

  let hotels: { id: string; name: string }[] = [];
  if (!hotelId) {
    let hotelsQuery = supabase.from('hotels').select('id, name').order('name');
    if (session.hotelScope.length) hotelsQuery = hotelsQuery.in('id', session.hotelScope);
    hotels = ((await hotelsQuery).data ?? []) as typeof hotels;
  }

  let query = supabase
    .from('room_types')
    .select(
      'id, name, slug, base_price, discount_percent, max_adults, max_occupancy, is_active, hotels!inner (id, name), rooms (id), room_images (id)',
    )
    .order('sort_order')
    .limit(300);

  if (session.hotelScope.length) query = query.in('hotel_id', session.hotelScope);
  const hotelFilter = hotelId ?? searchParams.hotel;
  if (hotelFilter) query = query.eq('hotel_id', hotelFilter);

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const roomTypes = (data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Room types drive pricing and availability; physical rooms set the default allocation."
        action={
          panel?.newHref ? (
            <Link href={panel.newHref} className="btn-primary">+ Add room type</Link>
          ) : null
        }
      />

      {hotelId ? null : (
        <form className="mb-4 flex gap-2">
          <select name="hotel" className="input max-w-xs" defaultValue={searchParams.hotel ?? ''}>
            <option value="">All hotels</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-outline">Filter</button>
        </form>
      )}

      <Table
        headers={[
          'Room type',
          ...(hotelId ? [] : ['Hotel']),
          'Occupancy',
          { label: 'Physical rooms', align: 'right' },
          { label: 'Base price', align: 'right' },
          'Status',
          ...(panel ? ['Photos'] : []),
        ]}
        empty="No room types yet."
      >
        {roomTypes.map((rt) => {
          const hotel = Array.isArray(rt.hotels) ? rt.hotels[0] : rt.hotels;
          return (
            <tr key={rt.id}>
              <Td>
                <span className="font-medium text-slate-900">{rt.name}</span>
                <p className="text-xs text-slate-400">/{rt.slug}</p>
              </Td>
              {hotelId ? null : (
                <Td>
                  <Link href={`/admin/hotels/${hotel?.id}`} className="hover:underline">
                    {hotel?.name}
                  </Link>
                </Td>
              )}
              <Td>
                {rt.max_adults} adults · max {rt.max_occupancy}
              </Td>
              <Td align="right">{rt.rooms?.length ?? 0}</Td>
              <Td align="right">
                {formatCurrency(Number(rt.base_price))}
                {Number(rt.discount_percent) > 0 ? (
                  <p className="text-xs text-emerald-600">−{rt.discount_percent}%</p>
                ) : null}
              </Td>
              <Td>
                <Badge tone={rt.is_active ? 'green' : 'slate'}>
                  {rt.is_active ? 'active' : 'inactive'}
                </Badge>
              </Td>
              {panel ? (
                <Td>
                  <Link href={panel.imagesHref(rt.id)} className="whitespace-nowrap font-medium text-blue-600 hover:underline">
                    {rt.room_images?.length ?? 0} photo{rt.room_images?.length === 1 ? '' : 's'} →
                  </Link>
                </Td>
              ) : null}
            </tr>
          );
        })}
      </Table>

      <p className="mt-4 text-xs text-slate-500">
        Availability and nightly rates are managed in{' '}
        <Link href={panel?.pricingHref ?? '/admin/inventory'} className="underline">Pricing &amp; availability</Link>.
      </p>
    </>
  );
}
