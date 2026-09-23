'use client';

import { useState } from 'react';
import { ChevronRight, Images, X } from 'lucide-react';
import type { HotelImage } from '@/types';

/**
 * Hotel gallery (PRD §6): one hero shot with two stacked beside it, and a
 * lightbox behind the photo count.
 */
export function PropertyGallery({ images, alt }: { images: HotelImage[]; alt: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        No photos yet
      </div>
    );
  }

  const [hero, ...rest] = images;
  const side = rest.slice(0, 2);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
          className="group relative col-span-2 overflow-hidden rounded-xl bg-slate-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.url}
            alt={hero.alt_text ?? alt}
            className="h-64 w-full object-cover transition group-hover:scale-[1.02] sm:h-[26rem]"
          />
          <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-slate-900/70 px-4 py-2 text-sm font-medium text-white backdrop-blur">
            <Images className="h-4 w-4" />
            {images.length} Property &amp; Guest Photos
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>

        <div className="grid gap-3">
          {side.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setIndex(i + 1);
                setOpen(true);
              }}
              className="group overflow-hidden rounded-xl bg-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt_text ?? alt}
                className="h-32 w-full object-cover transition group-hover:scale-[1.03] sm:h-[12.5rem]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} photos`}
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4"
        >
          <div className="flex items-center justify-between text-white">
            <p className="text-sm">
              {index + 1} / {images.length}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Close photos"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[index].url}
              alt={images[index].alt_text ?? alt}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          </div>

          <ul className="flex gap-2 overflow-x-auto">
            {images.map((image, i) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  aria-label={`Photo ${i + 1}`}
                  className={i === index ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-14 w-20 rounded object-cover" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
