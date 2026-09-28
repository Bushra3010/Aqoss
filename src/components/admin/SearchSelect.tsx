'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchOption {
  value: string;
  label: string;
  /** Extra text that is searched and shown faintly, e.g. the city. */
  hint?: string | null;
}

/**
 * A select you can type into — for long lists like "which hotel".
 *
 * Submits like a native select: the choice lives in a hidden input named
 * `name`, and choosing submits the surrounding form (a `FilterForm` applies it
 * at once). `allLabel` adds an empty-value first option such as "All hotels".
 */
export function SearchSelect({
  name,
  options,
  defaultValue = '',
  allLabel,
  placeholder = 'Search…',
  label,
  className,
  submitOnChange = true,
  onChange,
}: {
  name: string;
  options: SearchOption[];
  defaultValue?: string;
  allLabel?: string;
  placeholder?: string;
  /** Accessible name for the control. */
  label: string;
  className?: string;
  /** Submit the surrounding form on choosing — right for filters, not for data-entry forms. */
  submitOnChange?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const all = useMemo(
    () => (allLabel ? [{ value: '', label: allLabel }, ...options] : options),
    [allLabel, options],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q));
  }, [all, options, query]);

  const selected = all.find((o) => o.value === value);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted option in view — scrolling only the list itself.
  useEffect(() => {
    const el = list.current?.children[active] as HTMLElement | undefined;
    if (el && list.current) {
      const { offsetTop, offsetHeight } = el;
      const box = list.current;
      if (offsetTop < box.scrollTop) box.scrollTop = offsetTop;
      else if (offsetTop + offsetHeight > box.scrollTop + box.clientHeight) {
        box.scrollTop = offsetTop + offsetHeight - box.clientHeight;
      }
    }
  }, [active]);

  function openList() {
    setQuery('');
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(option: SearchOption) {
    setValue(option.value);
    setOpen(false);
    if (hidden.current) hidden.current.value = option.value;
    onChange?.(option.value);
    // Let the hidden input update before the form reads it.
    if (submitOnChange) queueMicrotask(() => hidden.current?.form?.requestSubmit());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={root} className={cn('relative', className)}>
      <input ref={hidden} type="hidden" name={name} defaultValue={value} />

      <button
        type="button"
        className="input flex w-full items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label ?? 'none'}`}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[16rem] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-controls={`${id}-list`}
              aria-expanded="true"
              aria-activedescendant={matches[active] ? `${id}-${active}` : undefined}
              aria-label={`Search ${label.toLowerCase()}`}
              className="w-full rounded-lg bg-slate-50 py-2 pl-8 pr-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                // Not a filter field: keep the surrounding FilterForm out of it.
                e.stopPropagation();
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>

          <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
            {matches.length ? (
              matches.map((option, i) => (
                <li
                  key={option.value || '__all'}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                    i === active ? 'bg-blue-50 text-slate-900' : 'text-slate-700',
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0 text-blue-600', option.value !== value && 'invisible')} aria-hidden="true" />
                  <span className="truncate">{option.label}</span>
                  {option.hint ? <span className="ml-auto shrink-0 text-xs text-slate-400">{option.hint}</span> : null}
                </li>
              ))
            ) : (
              <li className="px-3 py-3 text-sm text-slate-500">Nothing matches “{query}”.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
