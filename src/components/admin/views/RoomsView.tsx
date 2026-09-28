import Link from 'next/link';
import type { AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td } from '@/components/admin/shared';
import { FilterForm } from '@/components/admin/FilterForm';
import { Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { SearchSelect } from '@/components/admin/SearchSelect';

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
  base,
  pricingHref,
  newHref,
}: {
  session: AdminSession;
  searchParams: { hotel?: string; q?: string; status?: string };
  hotelId?: string;
  /** The rooms list this is, e.g. `/admin/rooms`; each room's page is `${base}/<id>`. */
  base: string;
  pricingHref: string;
  /** Set when the admin may add room types. */
  newHref?: string;
}) {
  const supabase = createAdminSupabase();

  let hotels: { id: string; name: string; city: string | null }[] = [];
  if (!hotelId) {
    let hotelsQuery = supabase.from('hotels').select('id, name, city').order('name');
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
  if (searchParams.status === 'active') query = query.eq('is_active', true);
  if (searchParams.status === 'inactive') query = query.eq('is_active', false);

  // Search matches the room's own name or its hotel's name or city. Characters
  // that mean something in a PostgREST filter are dropped from the term.
  const term = (searchParams.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
  if (term) {
    let matchingHotels = supabase.from('hotels').select('id').or(`name.ilike.%${term}%,city.ilike.%${term}%`);
    if (session.hotelScope.length) matchingHotels = matchingHotels.in('id', session.hotelScope);
    const hotelIds = ((await matchingHotels).data ?? []).map((h: { id: string }) => h.id);
    query = query.or(
      [`name.ilike.%${term}%`, `slug.ilike.%${term}%`, ...(hotelIds.length ? [`hotel_id.in.(${hotelIds.join(',')})`] : [])].join(','),
    );
  }

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const roomTypes = (data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Click a room to edit its details, price, room count and photos. Nightly rates for particular dates are in Pricing & Availability."
        action={
          newHref ? <Link href={newHref} className="btn-primary">+ Add room type</Link> : null
        }
      />

      <FilterForm className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          className="input max-w-xs"
          placeholder={hotelId ? 'Search rooms' : 'Search room, hotel or city'}
          defaultValue={searchParams.q ?? ''}
          aria-label="Search rooms"
        />
        {hotelId ? null : (
          <SearchSelect
            name="hotel"
            label="Hotel"
            placeholder="Search hotel or city"
            allLabel="All hotels"
            defaultValue={searchParams.hotel ?? ''}
            options={hotels.map((h) => ({ value: h.id, label: h.name, hint: h.city }))}
            className="w-full sm:w-72"
          />
        )}
        <select name="status" className="input max-w-[10rem]" defaultValue={searchParams.status ?? ''} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterForm>

      <p className="mb-2 text-sm text-slate-500">
        {roomTypes.length} room type{roomTypes.length === 1 ? '' : 's'}
      </p>

      <Table
        headers={[
          'Room type',
          ...(hotelId ? [] : ['Hotel']),
          'Occupancy',
          { label: 'Physical rooms', align: 'right' },
          { label: 'Base price', align: 'right' },
          'Status',
          'Photos',
        ]}
        empty={searchParams.q || searchParams.status || searchParams.hotel ? 'No rooms match these filters.' : 'No room types yet.'}
      >
        {roomTypes.map((rt) => {
          const hotel = Array.isArray(rt.hotels) ? rt.hotels[0] : rt.hotels;
          return (
            <tr key={rt.id}>
              <Td>
                <Link href={`${base}/${rt.id}`} className="font-medium text-slate-900 hover:underline">
                  {rt.name}
                </Link>
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
              <Td>
                <Link href={`${base}/${rt.id}#photos`} className="whitespace-nowrap font-medium text-blue-600 hover:underline">
                  {rt.room_images?.length ?? 0} photo{rt.room_images?.length === 1 ? '' : 's'} →
                </Link>
              </Td>
            </tr>
          );
        })}
      </Table>

      <p className="mt-4 text-xs text-slate-500">
        Availability and nightly rates are managed in{' '}
        <Link href={pricingHref} className="underline">Pricing &amp; availability</Link>.
      </p>
    </>
  );
}
