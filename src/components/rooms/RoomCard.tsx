import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import type { RoomTypeSummary } from '@/types';

/** Room summary card (PRD §7). */
export function RoomCard({ room, currency }: { room: RoomTypeSummary; currency: string }) {
  const cover = room.images.find((i) => i.is_cover) ?? room.images[0];
  const price = room.base_price * (1 - room.discount_percent / 100);

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="aspect-[4/3] bg-slate-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={cover.alt_text ?? room.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-slate-900">{room.name}</h3>

        <p className="mt-1 text-sm text-slate-500">
          {room.max_adults} adult{room.max_adults > 1 ? 's' : ''}
          {room.max_children > 0 ? ` · ${room.max_children} child${room.max_children > 1 ? 'ren' : ''}` : ''}
          {room.bed_type ? ` · ${room.bed_type}` : ''}
        </p>

        {room.amenities.length ? (
          <ul className="mt-3 space-y-1">
            {room.amenities.slice(0, 3).map((a) => (
              <li key={a.name} className="text-sm text-slate-600">✓ {a.name}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            {room.discount_percent > 0 ? (
              <p className="text-xs text-slate-400 line-through">
                {formatCurrency(room.base_price, currency)}
              </p>
            ) : null}
            <p className="text-xl font-bold text-slate-900">{formatCurrency(price, currency)}</p>
            <p className="text-xs text-slate-500">per night + taxes</p>
          </div>

          <Link href={`/rooms/${room.slug}`} className="btn-primary">
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
