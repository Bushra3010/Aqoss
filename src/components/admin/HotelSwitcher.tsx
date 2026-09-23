'use client';

import { usePathname, useRouter } from 'next/navigation';

/** Jump to the same section of another hotel's panel. */
export function HotelSwitcher({
  current,
  hotels,
}: {
  current: string;
  hotels: { slug: string; name: string; city: string | null }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Switch hotel</span>
      <select
        className="input max-w-[16rem] py-2"
        value={current}
        onChange={(e) => {
          const section = pathname.split('/').slice(4, 5).join('');
          // Detail pages (a booking, a room's photos) belong to the old hotel.
          router.push(`/admin/h/${e.target.value}${section ? `/${section}` : ''}`);
        }}
      >
        {hotels.map((h) => (
          <option key={h.slug} value={h.slug}>
            {h.name}
            {h.city ? ` · ${h.city}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
