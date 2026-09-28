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
 * Availability calendar and bulk editor (PRD §9). `lockedHotelId` pins it to
 * one property for a hotel's own panel and drops the hotel picker.
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

  const [roomTypesResult, calendar] = await Promise.all([
    hotelId
      ? supabase
          .from('room_types')
          .select('id, name')
          .eq('hotel_id', hotelId)
          .eq('is_active', true)
          .order('sort_order')
      : Promise.resolve({ data: [] }),
    hotelId ? getInventoryCalendar(hotelId, from, toISO) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Inventory & rates"
        description="Allocation per night. A room type is only sellable on nights that have an inventory row."
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
        roomTypes={(roomTypesResult.data ?? []) as { id: string; name: string }[]}
        calendar={calendar}
        from={from}
        to={toISO}
        canWrite={can(session, 'inventory.write')}
      />
    </>
  );
}
