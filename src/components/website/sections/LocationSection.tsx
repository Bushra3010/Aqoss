import type { HotelSiteData } from '@/types';

const GROUP_LABELS: Record<string, string> = {
  airport: 'Airports',
  railway: 'Railway stations',
  bus_stand: 'Bus stands',
  attraction: 'Nearby attractions',
};

/** Location module (PRD §17). */
export function LocationSection({ site }: { site: HotelSiteData }) {
  const { hotel, nearby } = site;

  const address = [
    hotel.address_line1, hotel.address_line2, hotel.city,
    hotel.state, hotel.postal_code, hotel.country,
  ]
    .filter(Boolean)
    .join(', ');

  const mapsHref =
    hotel.google_maps_url ??
    (hotel.latitude && hotel.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${address}`)}`);

  const embedSrc =
    hotel.latitude && hotel.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${hotel.longitude - 0.01}%2C${hotel.latitude - 0.01}%2C${hotel.longitude + 0.01}%2C${hotel.latitude + 0.01}&layer=mapnik&marker=${hotel.latitude}%2C${hotel.longitude}`
      : null;

  const grouped = nearby.reduce<Record<string, typeof nearby>>((acc, place) => {
    (acc[place.place_type] ??= []).push(place);
    return acc;
  }, {});

  return (
    <section id="location" className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-900">Location</h2>
      <p className="mt-1 text-sm text-slate-500">{address}</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {embedSrc ? (
          <iframe
            title={`Map showing ${hotel.name}`}
            src={embedSrc}
            className="h-[320px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <p className="flex h-48 items-center justify-center text-sm text-slate-500">
            Map coordinates have not been set for this property.
          </p>
        )}
      </div>

      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium"
        style={{ color: 'var(--brand-700)' }}
      >
        Open in Google Maps →
      </a>

      {Object.keys(grouped).length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {Object.entries(grouped).map(([type, places]) => (
            <div key={type}>
              <h3 className="text-sm font-semibold text-slate-900">
                {GROUP_LABELS[type] ?? type.replace(/_/g, ' ')}
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {places.map((place) => (
                  <li key={place.id} className="flex items-start justify-between gap-3">
                    <span className="text-slate-700">{place.name}</span>
                    <span className="shrink-0 text-right text-slate-500">
                      {place.distance_km ? `${place.distance_km} km` : null}
                      {place.travel_time ? (
                        <span className="block text-xs">{place.travel_time}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
