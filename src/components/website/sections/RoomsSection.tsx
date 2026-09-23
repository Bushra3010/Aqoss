import { AvailabilityCard } from '@/components/rooms/AvailabilityCard';
import { RoomCard } from '@/components/rooms/RoomCard';
import { Alert } from '@/components/ui';
import { searchAvailability } from '@/services/availability.service';
import { availabilitySchema } from '@/lib/validation/schemas';
import { formatDate, nightsBetween, todayISO } from '@/lib/utils';
import type { HotelSiteData } from '@/types';

/**
 * Rooms and live availability (PRD §7, §8).
 *
 * With dates in the query string this shows what the database says is
 * bookable; without them it lists the room types.
 */
export async function RoomsSection({
  site,
  searchParams,
}: {
  site: HotelSiteData;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const hasDates = Boolean(searchParams.check_in && searchParams.check_out);

  let results: Awaited<ReturnType<typeof searchAvailability>> = [];
  let error: string | null = null;
  let search: { check_in: string; check_out: string; adults: number; children: number; rooms: number } | null =
    null;

  if (hasDates) {
    const parsed = availabilitySchema.safeParse({
      check_in: searchParams.check_in,
      check_out: searchParams.check_out,
      adults: searchParams.adults ?? 2,
      children: searchParams.children ?? 0,
      rooms: searchParams.rooms ?? 1,
    });

    if (!parsed.success) {
      error = parsed.error.errors[0]?.message ?? 'Please check your dates.';
    } else if (parsed.data.check_in < todayISO()) {
      error = 'Check-in cannot be in the past.';
    } else {
      search = parsed.data;
      try {
        results = await searchAvailability({
          hotelId: site.hotel.id,
          checkIn: parsed.data.check_in,
          checkOut: parsed.data.check_out,
          adults: parsed.data.adults,
          children: parsed.data.children,
          rooms: parsed.data.rooms,
        });
      } catch (err) {
        console.error('[aqoss] availability search failed', err);
        error = 'We could not check availability just now. Please try again.';
      }
    }
  }

  const available = results.filter((r) => r.is_available);
  const soldOut = results.filter((r) => !r.is_available);

  return (
    <section id="rooms" className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-900">Rooms &amp; availability</h2>
        {search && !error ? (
          <p className="text-sm text-slate-500">
            {available.length} room type{available.length === 1 ? '' : 's'} available
          </p>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Choose your dates in the search bar above to see live availability and the exact price.
      </p>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {search && !error ? (
        <>
          <p className="mt-4 text-sm font-semibold text-slate-900">
            {formatDate(search.check_in)} → {formatDate(search.check_out)}
            <span className="ml-2 font-normal text-slate-500">
              {nightsBetween(search.check_in, search.check_out)} night
              {nightsBetween(search.check_in, search.check_out) > 1 ? 's' : ''} ·{' '}
              {search.adults + search.children} guest
              {search.adults + search.children > 1 ? 's' : ''} · {search.rooms} room
              {search.rooms > 1 ? 's' : ''}
            </span>
          </p>

          {available.length === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              No rooms available for these dates. Try shifting your stay by a night or two, or
              reducing the number of rooms.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {available.map((result) => (
                <li key={result.room_type_id}>
                  <AvailabilityCard
                    result={result}
                    details={site.roomTypes.find((rt) => rt.id === result.room_type_id)}
                    currency={site.hotel.currency}
                    search={search!}
                  />
                </li>
              ))}
            </ul>
          )}

          {soldOut.length ? (
            <>
              <h3 className="mt-7 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Not available for these dates
              </h3>
              <ul className="mt-2 space-y-2">
                {soldOut.map((room) => (
                  <li
                    key={room.room_type_id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 opacity-70"
                  >
                    <span className="font-medium text-slate-700">{room.name}</span>
                    <span className="text-sm text-slate-500">Sold out</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {site.roomTypes.map((room) => (
            <RoomCard key={room.id} room={room} currency={site.hotel.currency} />
          ))}
        </div>
      )}

      {site.roomTypes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Rooms are being set up for this property.</p>
      ) : null}
    </section>
  );
}
