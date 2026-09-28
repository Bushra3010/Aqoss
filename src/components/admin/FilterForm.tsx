'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
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

  const active = [...searchParams.keys()].length > 0;

  return (
    <form
      role="search"
      className={cn(className, 'transition-opacity', pending && 'opacity-60')}
      onChange={onChange}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
      aria-busy={pending}
    >
      <div key={generation} className="contents">
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
          className="btn-ghost shrink-0 self-center text-sm"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
