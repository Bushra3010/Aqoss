import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getInventoryCalendar } from '@/services/availability.service';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { InventoryEditor } from '@/components/admin/InventoryEditor';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Inventory · AQOSS CRM' };

/** Availability calendar and bulk editor (PRD §9). */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { hotel?: string; from?: string; days?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'inventory.read')) return <NoAccess />;

  const supabase = createAdminSupabase();

  let hotelsQuery = supabase.from('hotels').select('id, name').order('name');
  if (session!.hotelScope.length) hotelsQuery = hotelsQuery.in('id', session!.hotelScope);
  const { data: hotels } = await hotelsQuery;

  const hotelId = searchParams.hotel ?? hotels?.[0]?.id ?? null;
  const from = searchParams.from ?? todayISO();
  const days = Math.min(Number(searchParams.days ?? 14), 31);

  const to = new Date(`${from}T00:00:00`);
  to.setDate(to.getDate() + days);
  const toISO = to.toISOString().slice(0, 10);

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
        <select name="hotel" className="input max-w-xs" defaultValue={hotelId ?? ''}>
          {(hotels ?? []).map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
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
