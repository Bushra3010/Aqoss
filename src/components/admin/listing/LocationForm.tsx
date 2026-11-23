'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Plus, Trash2 } from 'lucide-react';
import { saveLocationStep, type ListingActionState } from '@/app/admin/listing-actions';
import { NEARBY_TYPES } from '@/lib/listing';
import { FormRow, FormSection, StepBody } from './parts';
import { StepFooter } from './StepFooter';
import { ErrorBanner } from './ScrollTop';

export interface LocationValues {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Place {
  key: number;
  place_type: string;
  name: string;
  distance_km: number | null;
}

let nextKey = 1;

export function LocationForm({
  hotelId,
  values,
  nearby,
  backHref,
}: {
  hotelId: string;
  values: LocationValues;
  nearby: { place_type: string; name: string; distance_km: number | null }[];
  backHref: string;
}) {
  const [state, action] = useFormState<ListingActionState, FormData>(saveLocationStep, {});
  const [places, setPlaces] = useState<Place[]>(() =>
    nearby.length
      ? nearby.map((p) => ({ ...p, key: nextKey++ }))
      : [
          { key: nextKey++, place_type: 'airport', name: '', distance_km: null },
          { key: nextKey++, place_type: 'railway', name: '', distance_km: null },
        ],
  );
  const err = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={action} noValidate>
      <input type="hidden" name="hotel_id" value={hotelId} />

      <StepBody title="Location" description="Where the property is. The website shows the address, a map and what is nearby.">
        <ErrorBanner state={state} />

        <FormSection title="Address" description="As guests should type it into a map">
          <FormRow label="Street address" htmlFor="address_line1" error={err('address_line1')} required>
            <input id="address_line1" name="address_line1" className="input" placeholder="Building, street" defaultValue={values.address_line1 ?? ''} maxLength={200} />
          </FormRow>
          <FormRow label="Area / landmark" htmlFor="address_line2" error={err('address_line2')}>
            <input id="address_line2" name="address_line2" className="input" placeholder="Near…" defaultValue={values.address_line2 ?? ''} maxLength={200} />
          </FormRow>
          <FormRow label="City" htmlFor="city" error={err('city')} required>
            <input id="city" name="city" className="input" defaultValue={values.city ?? ''} maxLength={80} />
          </FormRow>
          <FormRow label="State" htmlFor="state" error={err('state')} required>
            <input id="state" name="state" className="input" defaultValue={values.state ?? ''} maxLength={80} />
          </FormRow>
          <FormRow label="PIN code" htmlFor="postal_code" error={err('postal_code')} required>
            <input id="postal_code" name="postal_code" className="input" inputMode="numeric" defaultValue={values.postal_code ?? ''} maxLength={10} />
          </FormRow>
          <FormRow label="Country" htmlFor="country" error={err('country')}>
            <input id="country" name="country" className="input" defaultValue={values.country ?? 'India'} maxLength={80} />
          </FormRow>
        </FormSection>

        <FormSection title="Map" description="Optional, but guests find the property faster with it">
          <FormRow
            label="Google Maps link"
            hint="Open the property in Google Maps, tap Share and paste the link"
            htmlFor="google_maps_url"
            error={err('google_maps_url')}
          >
            <input id="google_maps_url" name="google_maps_url" type="url" className="input" placeholder="https://maps.app.goo.gl/…" defaultValue={values.google_maps_url ?? ''} />
          </FormRow>
          <FormRow label="Map pin" hint="Latitude and longitude show a map on the website" error={err('latitude') ?? err('longitude')}>
            <div className="grid grid-cols-2 gap-3">
              <input name="latitude" className="input" inputMode="decimal" placeholder="Latitude, e.g. 15.5439" defaultValue={values.latitude ?? ''} aria-label="Latitude" />
              <input name="longitude" className="input" inputMode="decimal" placeholder="Longitude, e.g. 73.7553" defaultValue={values.longitude ?? ''} aria-label="Longitude" />
            </div>
          </FormRow>
        </FormSection>

        <FormSection title="What’s nearby" description="Airports, stations and sights, with their distance from the property">
          <div className="space-y-3 py-4">
            {places.map((place, i) => (
              <div key={place.key}>
                <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_8rem_auto]">
                  <select name="nearby_type" className="input" defaultValue={place.place_type} aria-label="Kind of place">
                    {NEARBY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input name="nearby_name" className="input" placeholder="Name, e.g. Goa International Airport" defaultValue={place.name} maxLength={120} aria-label="Place name" />
                  <input name="nearby_distance" className="input" inputMode="decimal" placeholder="km" defaultValue={place.distance_km ?? ''} aria-label="Distance in km" />
                  <button
                    type="button"
                    onClick={() => setPlaces((all) => all.filter((p) => p.key !== place.key))}
                    className="btn-ghost px-3"
                    aria-label="Remove this place"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {err(`nearby.${i}`) ? <p className="mt-1 text-sm text-rose-600">{err(`nearby.${i}`)}</p> : null}
              </div>
            ))}
            {places.length < 12 ? (
              <button
                type="button"
                onClick={() => setPlaces((all) => [...all, { key: nextKey++, place_type: 'attraction', name: '', distance_km: null }])}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
              >
                <Plus className="h-4 w-4" /> Add a place
              </button>
            ) : null}
          </div>
        </FormSection>
      </StepBody>

      <StepFooter backHref={backHref} />
    </form>
  );
}
