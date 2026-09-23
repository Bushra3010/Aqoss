import { can, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getInventoryCalendar } from '@/services/availability.service';
import { PageHeader } from '@/components/admin/shared';
import { InventoryEditor } from '@/components/admin/InventoryEditor';
import { todayISO, toISODate } from '@/lib/utils';

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

  let hotels: { id: string; name: string }[] = [];
  if (!lockedHotelId) {
    let hotelsQuery = supabase.from('hotels').select('id, name').order('name');
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

      <form className="mb-5 flex flex-wrap gap-2">
        {lockedHotelId ? null : (
          <select name="hotel" className="input max-w-xs" defaultValue={hotelId ?? ''}>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}
        <input name="from" type="date" className="input max-w-[10rem]" defaultValue={from} aria-label="From date" />
        <select name="days" className="input max-w-[8rem]" defaultValue={String(days)}>
          <option value="7">7 nights</option>
          <option value="14">14 nights</option>
          <option value="31">31 nights</option>
        </select>
        <button type="submit" className="btn-outline">Show</button>
      </form>

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
