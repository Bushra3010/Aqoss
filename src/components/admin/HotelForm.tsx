'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { saveHotel, type ActionState } from '@/app/admin/actions';

const initial: ActionState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save hotel'}
    </button>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function HotelForm({ hotel }: { hotel?: any }) {
  const [state, action] = useFormState(saveHotel, initial);

  return (
    <form action={action} className="card space-y-6 p-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      {hotel?.id ? <input type="hidden" name="id" value={hotel.id} /> : null}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Basics</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Hotel name" htmlFor="name">
            <input id="name" name="name" className="input" defaultValue={hotel?.name ?? ''} required />
          </Field>

          <Field label="Slug" htmlFor="slug" hint="Leave blank to generate from the name.">
            <input id="slug" name="slug" className="input" defaultValue={hotel?.slug ?? ''} pattern="[a-z0-9\-]+" />
          </Field>

          <Field label="Tagline" htmlFor="tagline">
            <input id="tagline" name="tagline" className="input" defaultValue={hotel?.tagline ?? ''} />
          </Field>

          <Field label="Star rating" htmlFor="star_rating">
            <input
              id="star_rating"
              name="star_rating"
              type="number"
              step="0.5"
              min="0"
              max="5"
              className="input"
              defaultValue={hotel?.star_rating ?? ''}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                name="description"
                className="input min-h-32"
                defaultValue={hotel?.description ?? ''}
              />
            </Field>
          </div>

          <Field label="Status" htmlFor="status" hint="Only ACTIVE hotels are visible to the public.">
            <select id="status" name="status" className="input" defaultValue={hotel?.status ?? 'DRAFT'}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" className="input" defaultValue={hotel?.email ?? ''} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <input id="phone" name="phone" className="input" defaultValue={hotel?.phone ?? ''} />
          </Field>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Location</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address_line1">
              <input id="address_line1" name="address_line1" className="input" defaultValue={hotel?.address_line1 ?? ''} />
            </Field>
          </div>
          <Field label="City" htmlFor="city">
            <input id="city" name="city" className="input" defaultValue={hotel?.city ?? ''} />
          </Field>
          <Field label="State" htmlFor="state">
            <input id="state" name="state" className="input" defaultValue={hotel?.state ?? ''} />
          </Field>
          <Field label="Country" htmlFor="country">
            <input id="country" name="country" className="input" defaultValue={hotel?.country ?? 'India'} />
          </Field>
          <Field label="Postal code" htmlFor="postal_code">
            <input id="postal_code" name="postal_code" className="input" defaultValue={hotel?.postal_code ?? ''} />
          </Field>
          <Field label="Latitude" htmlFor="latitude">
            <input id="latitude" name="latitude" type="number" step="any" className="input" defaultValue={hotel?.latitude ?? ''} />
          </Field>
          <Field label="Longitude" htmlFor="longitude">
            <input id="longitude" name="longitude" type="number" step="any" className="input" defaultValue={hotel?.longitude ?? ''} />
          </Field>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Operations</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <Field label="Check-in" htmlFor="check_in_time">
            <input id="check_in_time" name="check_in_time" type="time" className="input" defaultValue={(hotel?.check_in_time ?? '14:00:00').slice(0, 5)} />
          </Field>
          <Field label="Check-out" htmlFor="check_out_time">
            <input id="check_out_time" name="check_out_time" type="time" className="input" defaultValue={(hotel?.check_out_time ?? '11:00:00').slice(0, 5)} />
          </Field>
          <Field label="Tax %" htmlFor="tax_percent">
            <input id="tax_percent" name="tax_percent" type="number" step="0.01" min="0" max="100" className="input" defaultValue={hotel?.tax_percent ?? 12} />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <input id="currency" name="currency" className="input" maxLength={3} defaultValue={hotel?.currency ?? 'INR'} />
          </Field>
        </div>
      </section>

      <div className="border-t border-slate-200 pt-6">
        <Submit />
      </div>
    </form>
  );
}
