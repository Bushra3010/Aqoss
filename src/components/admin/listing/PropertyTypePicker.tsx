'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { PROPERTY_CATEGORIES, PROPERTY_TYPES, propertyType, type PropertyCategory } from '@/lib/listing';
import { cn } from '@/lib/utils';

/**
 * "Which property type would you like to list?" — Hotel or Homestays & Villas,
 * then the kind within it. Used by the CRM's List property and by owners
 * listing from the website.
 */
export function PropertyTypePicker({
  value,
  onChange,
  onContinue,
  cancelHref,
  continueLabel = 'List property',
}: {
  value: string | null;
  onChange: (type: string | null) => void;
  onContinue: () => void;
  cancelHref: string;
  continueLabel?: string;
}) {
  const [category, setCategory] = useState<PropertyCategory>(propertyType(value)?.category ?? 'hotel');
  const types = PROPERTY_TYPES.filter((t) => t.category === category);
  const categoryLabel = category === 'hotel' ? 'Hotel' : 'Homestay or Villa';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="p-4 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Which property type would you like to list?</h2>
        <p className="mt-1 text-sm text-slate-500">Please select your property type from the options below</p>

        <fieldset className="mt-5">
          <legend className="sr-only">Property category</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROPERTY_CATEGORIES.map((c) => {
              const selected = c.key === category;
              return (
                <label
                  key={c.key}
                  className={cn(
                    'relative flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition',
                    selected ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.key}
                    checked={selected}
                    onChange={() => {
                      setCategory(c.key);
                      if (propertyType(value)?.category !== c.key) onChange(null);
                    }}
                    className="sr-only"
                  />
                  <span>
                    <span className="block text-base font-bold text-slate-900">{c.label}</span>
                    <span className="mt-1 block text-sm text-slate-600">{c.description}</span>
                  </span>
                  <Tick on={selected} />
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-lg font-bold text-slate-900">Type of {categoryLabel}</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {types.map((t) => {
              const selected = t.key === value;
              return (
                <label
                  key={t.key}
                  className={cn(
                    'relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition',
                    selected ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
                  )}
                >
                  <input
                    type="radio"
                    name="property_type"
                    value={t.key}
                    checked={selected}
                    onChange={() => onChange(t.key)}
                    className="peer sr-only"
                  />
                  {/* Fixed height, so a two-line name doesn't push its photo out of line. */}
                  <span className="flex min-h-[3.25rem] items-center justify-between gap-2 px-3 pb-1 pt-2 peer-focus-visible:underline">
                    <span className="text-sm font-bold text-slate-900">{t.label}</span>
                    <Tick on={selected} />
                  </span>
                  <span className="relative mx-3 block h-32 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={t.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </span>
                  <span className="px-3 pb-3 pt-2 text-xs leading-relaxed text-slate-600">{t.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-4 py-3 sm:px-8">
        <Link href={cancelHref} className="btn-ghost text-blue-700">
          Cancel
        </Link>
        <button type="button" className="btn-primary min-w-36" disabled={!value} onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
        on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white',
      )}
      aria-hidden="true"
    >
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}
