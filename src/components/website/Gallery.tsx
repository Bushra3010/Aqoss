'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { HotelImage } from '@/types';

/** Hotel gallery (PRD §6). Falls back gracefully when a hotel has few images. */
export function Gallery({ images, alt }: { images: HotelImage[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-200 text-sm text-slate-500 sm:h-96">
        No photos yet
      </div>
    );
  }

  const main = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main.url}
          alt={main.alt_text ?? alt}
          className="h-64 w-full object-cover sm:h-[26rem]"
          loading="eager"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  'overflow-hidden rounded-lg border-2 transition',
                  i === active ? 'border-slate-900' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-16 w-24 object-cover"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
