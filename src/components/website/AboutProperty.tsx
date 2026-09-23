'use client';

import { useState } from 'react';
import { amenityIcon } from './icons';
import type { HotelAmenity } from '@/types';

/** Description with a read-more, plus the amenity strip (PRD §6). */
export function AboutProperty({
  description,
  amenities,
}: {
  description: string | null;
  amenities: HotelAmenity[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [allAmenities, setAllAmenities] = useState(false);

  const paragraphs = (description ?? '').split('\n').filter(Boolean);
  const visible = expanded ? paragraphs : paragraphs.slice(0, 1);
  const shown = allAmenities ? amenities : amenities.slice(0, 6);

  return (
    <>
      <section>
        <h2 className="text-xl font-bold text-slate-900">About Property</h2>

        {paragraphs.length ? (
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
            {visible.map((para, i) => (
              <p key={i}>
                {para}
                {!expanded && i === visible.length - 1 && paragraphs.length > 1 ? (
                  <>
                    {' … '}
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      className="font-medium"
                      style={{ color: 'var(--brand-700)' }}
                    >
                      Read more
                    </button>
                  </>
                ) : null}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Description coming soon.</p>
        )}
      </section>

      {amenities.length ? (
        <section className="mt-7">
          <h2 className="text-xl font-bold text-slate-900">Amenities</h2>

          <ul className="mt-3 flex flex-wrap gap-x-7 gap-y-3">
            {shown.map((amenity) => {
              const Icon = amenityIcon(amenity.name);
              return (
                <li key={amenity.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <Icon className="h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" />
                  {amenity.name}
                </li>
              );
            })}
          </ul>

          {amenities.length > 6 ? (
            <button
              type="button"
              onClick={() => setAllAmenities((v) => !v)}
              className="mt-2.5 text-sm font-medium"
              style={{ color: 'var(--brand-700)' }}
            >
              {allAmenities ? 'Show less' : 'View All'}
            </button>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
