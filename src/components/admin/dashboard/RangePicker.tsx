'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

export const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

/** Range selector used by the header and each chart card. */
export function RangePicker({
  param = 'range',
  size = 'md',
}: {
  param?: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // A chart without its own selection follows the header's range, which is
  // also what the page uses to fetch its data.
  const current = params.get(param) ?? params.get('range') ?? '7';
  const label = RANGES.find((r) => r.value === current)?.label ?? 'Last 7 days';

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function choose(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(param, value);
    router.push(`/admin?${next.toString()}`, { scroll: false });
    setOpen(false);
  }

  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 transition hover:bg-slate-50 ${padding}`}
      >
        {size === 'md' ? <CalendarDays className="h-4 w-4 text-slate-400" /> : null}
        {label}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {RANGES.map((range) => (
            <li key={range.value}>
              <button
                type="button"
                role="option"
                aria-selected={range.value === current}
                onClick={() => choose(range.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  range.value === current ? 'font-semibold text-blue-600' : 'text-slate-600'
                }`}
              >
                {range.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
