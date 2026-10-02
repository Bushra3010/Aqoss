'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A list page's filter bar. Filters live in the URL (so a filtered list can
 * be shared or reloaded), but apply as soon as they change: selects and dates
 * at once, typing after a short pause, Enter immediately. Empty fields are
 * dropped from the URL rather than sent as `?q=`.
 */
export function FilterForm({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // Fields are uncontrolled (defaultValue), so after Clear they are remounted
  // once the unfiltered page has arrived, picking up its empty defaults.
  const clearing = useRef(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (clearing.current && !searchParams.toString()) {
      clearing.current = false;
      setGeneration((g) => g + 1);
    }
  }, [searchParams]);

  function apply(form: HTMLFormElement) {
    clearTimeout(timer.current);
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    if (query === searchParams.toString()) return;
    start(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function onChange(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    const typing = target.tagName === 'INPUT' && ['text', 'search', ''].includes(target.type);
    const form = event.currentTarget;
    if (typing) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => apply(form), 350);
    } else {
      apply(form);
    }
  }

  const activeCount = [...searchParams.keys()].length;
  const active = activeCount > 0;
  // On phones the fields fold away behind one button so the list is visible
  // first; from `sm` up they are always shown.
  const [open, setOpen] = useState(false);

  return (
    <form
      role="search"
      // One layout for every list: fields share the row and wrap onto the next
      // rather than shrinking past a readable width (the content column is
      // narrow on tablets, beside the sidebar). `cn` lets this `flex` replace a
      // page's own `flex`/`grid`; pages only add spacing.
      className={cn(
        className,
        'flex flex-wrap items-center gap-2 transition-opacity',
        '[&>div>*]:min-w-[10rem] [&>div>*]:flex-1 [&>div>*]:basis-40',
        pending && 'opacity-60',
      )}
      onChange={onChange}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
      aria-busy={pending}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn-outline w-full justify-between sm:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Search &amp; filters
          {active ? (
            <span className="rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">{activeCount}</span>
          ) : null}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <div key={generation} className={cn(open ? 'contents' : 'hidden', 'sm:contents')}>
        {children}
      </div>
      {active ? (
        <Link
          href={pathname}
          scroll={false}
          onClick={() => {
            clearTimeout(timer.current);
            clearing.current = true;
          }}
          className={cn('btn-ghost shrink-0 self-center text-sm', !open && 'hidden sm:inline-flex')}
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
