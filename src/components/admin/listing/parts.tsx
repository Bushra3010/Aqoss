import Link from 'next/link';
import { Check } from 'lucide-react';
import { LISTING_STEPS, listingPath, type ListingStepKey } from '@/lib/listing';
import { cn } from '@/lib/utils';

/**
 * The numbered tabs across the top of a listing. Before the property exists
 * (the first Basic Info) only the current tab is live; after that every step
 * can be opened in any order, and finished ones show a tick.
 */
export function ListingSteps({
  hotelId,
  current,
  progress,
}: {
  hotelId?: string;
  current: ListingStepKey;
  progress?: Partial<Record<ListingStepKey, boolean>>;
}) {
  return (
    // `relative` keeps the screen-reader-only "(done)" labels inside this
    // scroller; without it they widen the whole CRM pane sideways.
    <nav aria-label="Listing steps" className="relative overflow-x-auto border-b border-slate-200">
      <ol className="flex min-w-max">
        {LISTING_STEPS.map((step, i) => {
          const active = step.key === current;
          const done = Boolean(progress?.[step.key]);
          const body = (
            <>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  done ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              {step.label}
              {done ? <span className="sr-only">(done)</span> : null}
            </>
          );
          const cls = cn(
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium',
            active ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500',
          );
          return (
            <li key={step.key}>
              {hotelId && !active ? (
                <Link href={listingPath(hotelId, step.key)} className={cn(cls, 'hover:text-slate-900')}>
                  {body}
                </Link>
              ) : (
                <span className={cn(cls, !active && 'cursor-not-allowed opacity-60')} aria-current={active ? 'step' : undefined}>
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** A titled box of form rows, like "Property details". */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200">
      <header className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </header>
      <div className="divide-y divide-slate-100 px-4 sm:px-5">{children}</div>
    </section>
  );
}

/** Question on the left, answer on the right; stacked on phones. */
export function FormRow({
  label,
  hint,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? 'label' : 'p';
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:gap-6">
      <div>
        <Label {...(htmlFor ? { htmlFor } : {})} className="text-sm font-semibold text-slate-900">
          {label}
          {required ? <span className="text-rose-600" aria-hidden="true"> *</span> : null}
        </Label>
        {hint ? <p className="mt-0.5 text-sm text-slate-500">{hint}</p> : null}
      </div>
      <div className="min-w-0">
        {children}
        {error ? (
          <p className="mt-1.5 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The page body under the tabs: step title, then its sections. */
export function StepBody({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 p-4 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Yes / No as two radio buttons. */
export function YesNo({ name, value, idPrefix }: { name: string; value: boolean | null; idPrefix?: string }) {
  const id = idPrefix ?? name;
  return (
    <div className="flex gap-6 pt-1">
      {[
        ['no', 'No'],
        ['yes', 'Yes'],
      ].map(([v, label]) => (
        <label key={v} htmlFor={`${id}-${v}`} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            id={`${id}-${v}`}
            type="radio"
            name={name}
            value={v}
            defaultChecked={value === null ? false : value === (v === 'yes')}
            className="h-4 w-4 border-slate-300"
            required
          />
          {label}
        </label>
      ))}
    </div>
  );
}
