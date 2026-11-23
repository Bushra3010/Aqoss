'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveAmenitiesStep, type ListingActionState } from '@/app/admin/listing-actions';
import { AMENITY_GROUPS, KNOWN_AMENITIES } from '@/lib/listing';
import { FormSection, StepBody } from './parts';
import { StepFooter } from './StepFooter';
import { ErrorBanner } from './ScrollTop';

/** Ticked from the list, plus any others typed in; the website shows them all. */
export function AmenitiesForm({ hotelId, current, backHref }: { hotelId: string; current: string[]; backHref: string }) {
  const [state, action] = useFormState<ListingActionState, FormData>(saveAmenitiesStep, {});
  const known = new Set(KNOWN_AMENITIES.map((a) => a.name.toLowerCase()));
  const [picked, setPicked] = useState(() => new Set(current.map((n) => n.toLowerCase())));
  const others = current.filter((n) => !known.has(n.toLowerCase()));

  function toggle(name: string, on: boolean) {
    setPicked((now) => {
      const next = new Set(now);
      if (on) next.add(name.toLowerCase());
      else next.delete(name.toLowerCase());
      return next;
    });
  }

  const count = KNOWN_AMENITIES.filter((a) => picked.has(a.name.toLowerCase())).length;

  return (
    <form action={action}>
      <input type="hidden" name="hotel_id" value={hotelId} />

      <StepBody title="Amenities" description={`Tick everything the property offers guests. ${count} selected.`}>
        <ErrorBanner state={state} />

        {AMENITY_GROUPS.map((group) => (
          <FormSection key={group.category} title={group.label}>
            <div className="grid gap-x-6 gap-y-3 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((name) => (
                <label key={name} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="amenity"
                    value={name}
                    checked={picked.has(name.toLowerCase())}
                    onChange={(e) => toggle(name, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {name}
                </label>
              ))}
            </div>
          </FormSection>
        ))}

        <FormSection title="Anything else?" description="Separate with commas, e.g. Bonfire, Library, Yoga deck">
          <div className="py-4">
            <textarea
              name="other_amenities"
              className="input min-h-20"
              defaultValue={others.join(', ')}
              aria-label="Other amenities"
            />
            {state?.fieldErrors?.other_amenities ? (
              <p className="mt-1.5 text-sm text-rose-600">{state?.fieldErrors.other_amenities}</p>
            ) : null}
          </div>
        </FormSection>
      </StepBody>

      <StepFooter backHref={backHref} />
    </form>
  );
}
