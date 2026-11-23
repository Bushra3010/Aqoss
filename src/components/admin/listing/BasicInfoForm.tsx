'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveBasicInfoStep, type ListingActionState } from '@/app/admin/listing-actions';
import { PROPERTY_CATEGORIES, PROPERTY_TYPES, propertyType } from '@/lib/listing';
import { FormRow, FormSection, StepBody, YesNo } from './parts';
import { StepFooter } from './StepFooter';
import { ErrorBanner } from './ScrollTop';

export interface BasicInfoValues {
  name: string;
  star_rating: number | null;
  year_built: number | null;
  accepting_since: number | null;
  channel_manager: string | null;
  tagline: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
}

const thisYear = new Date().getFullYear();
const years = (from: number) => Array.from({ length: thisYear - from + 1 }, (_, i) => thisYear - i);

/**
 * Basic Info. For a new listing the type was just picked on the screen before
 * (`onBack` returns to it) and saving creates the hotel and its draft website;
 * for an existing one the type is a plain select.
 */
export function BasicInfoForm({
  hotelId,
  propertyTypeKey,
  values,
  onBack,
}: {
  hotelId?: string;
  propertyTypeKey: string;
  values?: BasicInfoValues;
  onBack?: () => void;
}) {
  const [state, action] = useFormState<ListingActionState, FormData>(saveBasicInfoStep, {});
  const [usesChannelManager, setUsesChannelManager] = useState(Boolean(values?.channel_manager));
  const err = (name: string) => state?.fieldErrors?.[name];
  const type = propertyType(propertyTypeKey);

  return (
    <form action={action} noValidate>
      {hotelId ? <input type="hidden" name="hotel_id" value={hotelId} /> : null}

      <StepBody title="Basic Info" description="Tell guests what the property is and how to reach it.">
        <ErrorBanner state={state} />

        <FormSection title="Property details" description="Update your property details here">
          <FormRow label="Type of property" htmlFor="property_type" error={err('property_type')} required>
            {hotelId ? (
              <select id="property_type" name="property_type" className="input" defaultValue={propertyTypeKey}>
                {PROPERTY_CATEGORIES.map((category) => (
                  <optgroup key={category.key} label={category.label}>
                    {PROPERTY_TYPES.filter((t) => t.category === category.key).map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <input type="hidden" name="property_type" value={propertyTypeKey} />
                {type ? (
                  <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <Image src={type.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-slate-900">{type?.label ?? 'Not chosen'}</span>
                {onBack ? (
                  <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-700 hover:underline">
                    Change
                  </button>
                ) : null}
              </div>
            )}
          </FormRow>

          <FormRow
            label="Name of the property"
            hint="Enter the name as on the property documents"
            htmlFor="name"
            error={err('name')}
            required
          >
            <input id="name" name="name" className="input" placeholder="Enter the full name" defaultValue={values?.name ?? ''} maxLength={160} />
          </FormRow>

          <FormRow label="Hotel star rating" htmlFor="star_rating" error={err('star_rating')}>
            <select id="star_rating" name="star_rating" className="input" defaultValue={values?.star_rating ? String(Math.round(values.star_rating)) : ''}>
              <option value="">Select rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} star
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="When was the property built?" htmlFor="year_built" error={err('year_built')}>
            <select id="year_built" name="year_built" className="input" defaultValue={values?.year_built ?? ''}>
              <option value="">Select a year</option>
              {years(1850).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow
            label="Accepting bookings since?"
            hint="Since when is this property available for guests to book"
            htmlFor="accepting_since"
            error={err('accepting_since')}
          >
            <select id="accepting_since" name="accepting_since" className="input" defaultValue={values?.accepting_since ?? ''}>
              <option value="">Select a year</option>
              {years(1950).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow
            label="Do you work with a channel manager?"
            hint="This lets you update inventory across different travel websites at once"
            error={err('channel_manager') ?? err('channel_manager_name')}
            required
          >
            <div
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.name === 'channel_manager') setUsesChannelManager(target.value === 'yes');
              }}
            >
              <YesNo name="channel_manager" value={values ? Boolean(values.channel_manager) : null} />
            </div>
            {usesChannelManager ? (
              <input
                name="channel_manager_name"
                className="input mt-3"
                placeholder="Which one? e.g. eZee, STAAH, AxisRooms"
                defaultValue={values?.channel_manager ?? ''}
                maxLength={80}
                aria-label="Channel manager name"
              />
            ) : null}
          </FormRow>
        </FormSection>

        <FormSection title="About the property" description="Shown at the top of the website.">
          <FormRow label="Tagline" hint="One line, e.g. “Beachfront rooms 5 minutes from Calangute”" htmlFor="tagline" error={err('tagline')}>
            <input id="tagline" name="tagline" className="input" defaultValue={values?.tagline ?? ''} maxLength={200} />
          </FormRow>
          <FormRow label="Description" hint="What makes the property special: setting, rooms, food, service" htmlFor="description" error={err('description')}>
            <textarea id="description" name="description" className="input min-h-32" defaultValue={values?.description ?? ''} maxLength={5000} />
          </FormRow>
        </FormSection>

        <FormSection title="Contact details" description="Guests use these to reach the property; they appear on the website.">
          <FormRow label="Email" htmlFor="email" error={err('email')} required>
            <input id="email" name="email" type="email" className="input" placeholder="reservations@yourhotel.com" defaultValue={values?.email ?? ''} />
          </FormRow>
          <FormRow label="Phone" htmlFor="phone" error={err('phone')} required>
            <input id="phone" name="phone" type="tel" className="input" placeholder="+91 98765 43210" defaultValue={values?.phone ?? ''} />
          </FormRow>
        </FormSection>
      </StepBody>

      <StepFooter onBack={onBack} backHref={onBack ? undefined : '/admin/hotels'} />
    </form>
  );
}
