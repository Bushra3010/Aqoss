'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { createPanelRoomType, type PanelActionState } from '@/app/admin/h/actions';

/** New room type for one hotel. Saving opens its photo page. */
export function RoomTypeForm({ hotelId, cancelHref }: { hotelId: string; cancelHref: string }) {
  const [state, action] = useFormState<PanelActionState, FormData>(createPanelRoomType, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="hotel_id" value={hotelId} />
      {state.error ? <Alert>{state.error}</Alert> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Room</h2>
        <p className="text-sm text-slate-500">What guests see on the room card.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Room name" htmlFor="name" error={err('name')}>
            <input id="name" name="name" className="input" placeholder="Deluxe Sea View" required maxLength={80} />
          </Field>
          <Field label="Bed type" htmlFor="bed_type" error={err('bed_type')}>
            <input id="bed_type" name="bed_type" className="input" placeholder="1 King bed" maxLength={60} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={err('description')}>
              <textarea
                id="description"
                name="description"
                className="input min-h-24"
                maxLength={2000}
                placeholder="A bright room on the upper floors with a balcony facing the sea."
              />
            </Field>
          </div>
          <Field label="Room size (sq ft)" htmlFor="room_size_sqft" error={err('room_size_sqft')}>
            <input id="room_size_sqft" name="room_size_sqft" type="number" min={50} className="input" placeholder="320" />
          </Field>
          <Field
            label="Amenities"
            htmlFor="amenities"
            error={err('amenities')}
            hint="Separate with commas. Icons are matched automatically."
          >
            <input id="amenities" name="amenities" className="input" placeholder="Air conditioning, Wi-Fi, Balcony, Mini bar" />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Guests</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Adults" htmlFor="max_adults" error={err('max_adults')}>
            <input id="max_adults" name="max_adults" type="number" min={1} max={20} defaultValue={2} className="input" required />
          </Field>
          <Field label="Children" htmlFor="max_children" error={err('max_children')}>
            <input id="max_children" name="max_children" type="number" min={0} max={20} defaultValue={1} className="input" />
          </Field>
          <Field label="Max guests in total" htmlFor="max_occupancy" error={err('max_occupancy')}>
            <input id="max_occupancy" name="max_occupancy" type="number" min={1} max={30} defaultValue={3} className="input" required />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Price &amp; rooms</h2>
        <p className="text-sm text-slate-500">
          Opens the room for booking for the next 12 months. Change prices for particular nights in Pricing &amp; Availability.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Price per night (₹)" htmlFor="base_price" error={err('base_price')}>
            <input id="base_price" name="base_price" type="number" min={1} step="1" className="input" placeholder="4500" required />
          </Field>
          <Field label="Discount (%)" htmlFor="discount_percent" error={err('discount_percent')}>
            <input id="discount_percent" name="discount_percent" type="number" min={0} max={90} defaultValue={0} className="input" />
          </Field>
          <Field
            label="Number of rooms"
            htmlFor="physical_rooms"
            error={err('physical_rooms')}
            hint="How many of this room the hotel has."
          >
            <input id="physical_rooms" name="physical_rooms" type="number" min={1} max={500} defaultValue={1} className="input" required />
          </Field>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_refundable" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Free cancellation (refundable)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Show on the website now
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <Link href={cancelHref} className="btn-ghost">Cancel</Link>
        <p className="text-sm text-slate-500">Next you can add photos.</p>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Creating…' : 'Create room type'}
    </button>
  );
}
