'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ChevronDown, Heart, MapPin, User, Users } from 'lucide-react';
import { todayISO } from '@/lib/utils';

/**
 * The booking bar that sits under the header on every hotel website.
 *
 * It only collects the query and navigates — availability and price always
 * come back from the server (PRD §8). Location is fixed: a hotel website
 * sells one property, so it shows which one rather than offering a choice.
 */
export function BookingSearchBar({
  hotelName,
  city,
  signedIn,
}: {
  hotelName: string;
  city: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [checkIn, setCheckIn] = useState(params.get('check_in') ?? todayISO());
  const [checkOut, setCheckOut] = useState(params.get('check_out') ?? todayISO(1));
  const [rooms, setRooms] = useState(Number(params.get('rooms') ?? 1));
  const [adults, setAdults] = useState(Number(params.get('adults') ?? 2));
  const [children, setChildren] = useState(Number(params.get('children') ?? 0));

  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (guestsRef.current && !guestsRef.current.contains(event.target as Node)) {
        setGuestsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function search() {
    const query = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      adults: String(adults),
      children: String(children),
      rooms: String(rooms),
    });
    // Stay on the single page: re-render the rooms section with availability
    // and scroll straight to it.
    router.push(`/?${query.toString()}#rooms`, { scroll: false });
    window.setTimeout(() => {
      const el = document.getElementById('rooms');
      if (!el) return;

      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96 });
      // A programmatic scroll during a soft navigation can land before the tab
      // bar re-reads position; nudge it so the highlight follows.
      window.dispatchEvent(new Event('scroll'));
    }, 150);
  }

  const guestLabel =
    `${rooms} Room${rooms > 1 ? 's' : ''}, ${adults} Adult${adults > 1 ? 's' : ''}` +
    (children ? `, ${children} Child${children > 1 ? 'ren' : ''}` : '');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        <div className="grid flex-1 grid-cols-1 divide-slate-200 sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
          <Field icon={MapPin} label="Location">
            <p className="truncate text-sm font-semibold text-slate-900">
              {hotelName}
              {city ? `, ${city}` : ''}
            </p>
          </Field>

          <Field icon={CalendarDays} label="Check-in">
            <DateField
              label="Check-in date"
              value={checkIn}
              min={todayISO()}
              onChange={(value) => {
                setCheckIn(value);
                if (value >= checkOut) {
                  const next = new Date(`${value}T00:00:00`);
                  next.setDate(next.getDate() + 1);
                  setCheckOut(next.toISOString().slice(0, 10));
                }
              }}
            />
          </Field>

          <Field icon={CalendarDays} label="Check-out">
            <DateField
              label="Check-out date"
              value={checkOut}
              min={checkIn}
              onChange={setCheckOut}
            />
          </Field>

          <div className="relative" ref={guestsRef}>
            <Field icon={User} label="Guests">
              <button
                type="button"
                onClick={() => setGuestsOpen((v) => !v)}
                aria-expanded={guestsOpen}
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-slate-900"
              >
                <span className="truncate">{guestLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </Field>

            {guestsOpen ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <Stepper label="Rooms" value={rooms} min={1} max={6} onChange={setRooms} />
                <Stepper label="Adults" value={adults} min={1} max={12} onChange={setAdults} />
                <Stepper label="Children" value={children} min={0} max={8} onChange={setChildren} />
                <button
                  type="button"
                  onClick={() => setGuestsOpen(false)}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 lg:pl-1">
          <button
            type="button"
            onClick={search}
            className="flex-1 whitespace-nowrap rounded-lg bg-green-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-800 lg:flex-none"
          >
            Book This Now
          </button>

          <Link
            href={signedIn ? '/dashboard/bookings' : '/login'}
            className="hidden items-center gap-1.5 whitespace-nowrap px-2 text-sm text-slate-500 transition hover:text-slate-900 xl:flex"
          >
            <Heart className="h-5 w-5" />
            Wishlist
          </Link>

          <Link
            href={signedIn ? '/dashboard' : '/login'}
            aria-label={signedIn ? 'Your account' : 'Sign in'}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 sm:flex"
          >
            <Users className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-2">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40"
        >
          +
        </button>
      </span>
    </div>
  );
}

/**
 * A date input that reads as "Thu, 24 Sep 2026".
 *
 * Browsers will not let a native date input be reformatted, so the formatted
 * label is rendered underneath and the real input sits transparently on top —
 * keeping the platform's own date picker and keyboard behaviour.
 */
function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
}) {
  const formatted = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Select a date';

  return (
    <span className="relative block">
      <span className="block truncate text-sm font-semibold text-slate-900">{formatted}</span>
      <input
        type="date"
        aria-label={label}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}
