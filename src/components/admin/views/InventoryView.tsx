import { can, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getInventoryCalendar } from '@/services/availability.service';
import { PageHeader } from '@/components/admin/shared';
import { InventoryEditor } from '@/components/admin/InventoryEditor';
import { todayISO, toISODate } from '@/lib/utils';
import { FilterForm } from '@/components/admin/FilterForm';
import { SearchSelect } from '@/components/admin/SearchSelect';

export interface InventorySearch {
  hotel?: string;
  from?: string;
  days?: string;
}

/**
 * Rates and inventory per room category (PRD §9): rooms on sale and the four
 * occupancy rates for every night, plus a bulk editor for a date range.
 * `lockedHotelId` pins it to one property for a hotel's own panel and drops
 * the hotel picker.
 */
export async function InventoryView({
  session,
  searchParams,
  lockedHotelId,
}: {
  session: AdminSession;
  searchParams: InventorySearch;
  lockedHotelId?: string;
}) {
  const supabase = createAdminSupabase();

  let hotels: { id: string; name: string; city: string | null }[] = [];
  if (!lockedHotelId) {
    let hotelsQuery = supabase.from('hotels').select('id, name, city').order('name');
    if (session.hotelScope.length) hotelsQuery = hotelsQuery.in('id', session.hotelScope);
    hotels = ((await hotelsQuery).data ?? []) as typeof hotels;
  }

  const hotelId = lockedHotelId ?? searchParams.hotel ?? hotels[0]?.id ?? null;
  const from = searchParams.from ?? todayISO();
  const days = Math.min(Number(searchParams.days ?? 14), 31);

  const to = new Date(`${from}T00:00:00`);
  to.setDate(to.getDate() + days);
  const toISO = toISODate(to);

  const [roomTypesResult, calendar, pricesResult] = await Promise.all([
    hotelId
      ? supabase
          .from('room_types')
          .select('id, name, base_price, single_price, extra_adult_price, extra_child_price')
          .eq('hotel_id', hotelId)
          .eq('is_active', true)
          .order('sort_order')
      : Promise.resolve({ data: [] }),
    hotelId ? getInventoryCalendar(hotelId, from, toISO) : Promise.resolve([]),
    hotelId
      ? supabase
          .from('room_prices')
          .select('room_type_id, stay_date, price, single_price, extra_adult_price, extra_child_price')
          .eq('hotel_id', hotelId)
          .gte('stay_date', from)
          .lt('stay_date', toISO)
      : Promise.resolve({ data: [] }),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const roomTypes = ((roomTypesResult.data ?? []) as any[]).map((rt) => ({
    id: rt.id as string,
    name: rt.name as string,
    rates: {
      double: Number(rt.base_price),
      single: rt.single_price == null ? null : Number(rt.single_price),
      extraAdult: Number(rt.extra_adult_price ?? 0),
      extraChild: Number(rt.extra_child_price ?? 0),
    },
  }));
  const prices = ((pricesResult.data ?? []) as any[]).map((p) => ({
    room_type_id: p.room_type_id as string,
    stay_date: p.stay_date as string,
    double: Number(p.price),
    single: p.single_price == null ? null : Number(p.single_price),
    extraAdult: p.extra_adult_price == null ? null : Number(p.extra_adult_price),
    extraChild: p.extra_child_price == null ? null : Number(p.extra_child_price),
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <>
      <PageHeader
        title="Rate & inventory"
        description="Rooms on sale and rates per night for each room category. Bold rates are set for that night; the rest are the room's standard rates."
      />

      <FilterForm className="mb-5 flex flex-wrap gap-2">
        {lockedHotelId ? null : (
          <SearchSelect
            name="hotel"
            label="Hotel"
            placeholder="Search hotel or city"
            defaultValue={hotelId ?? ''}
            options={hotels.map((h) => ({ value: h.id, label: h.name, hint: h.city }))}
            className="w-full sm:w-72"
          />
        )}
        <input name="from" type="date" className="input max-w-[10rem]" defaultValue={from} aria-label="From date" />
        <select name="days" className="input max-w-[8rem]" defaultValue={String(days)}>
          <option value="7">7 nights</option>
          <option value="14">14 nights</option>
          <option value="31">31 nights</option>
        </select>
      </FilterForm>

      <InventoryEditor
        roomTypes={roomTypes}
        prices={prices}
        calendar={calendar}
        from={from}
        to={toISO}
        canWrite={can(session, 'inventory.write')}
      />
    </>
  );
}
