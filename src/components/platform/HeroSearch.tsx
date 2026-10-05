'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Building2, CalendarDays, CheckCircle2, ChevronDown, Handshake, MapPin, Search, ShieldCheck, User } from 'lucide-react';
import { cn, todayISO, toISODate } from '@/lib/utils';

export type HeroSearchValues = {
  q: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
};

const PROMISES = [
  { icon: Handshake, title: 'Book direct', text: 'Straight with the hotel, no middleman', tint: 'text-amber-500' },
  { icon: CheckCircle2, title: 'Instant confirmation', text: 'Confirmed the moment you pay', tint: 'text-emerald-600' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'Paid through a secure gateway', tint: 'text-blue-600' },
  { icon: BadgeCheck, title: 'Live availability', text: 'Rooms that can’t be double-booked', tint: 'text-orange-500' },
];

/**
 * The hero's hotel search. It is a plain GET form back to the home page, so it
 * works without JavaScript; the page lists the matching hotels and each one
 * opens on its own website with these dates, where availability is checked.
 */
export function HeroSearch({ initial }: { initial: HeroSearchValues }) {
  const [checkIn, setCheckIn] = useState(initial.checkIn || todayISO(1));
  const [checkOut, setCheckOut] = useState(initial.checkOut || todayISO(2));
  const [adults, setAdults] = useState(initial.adults);
  const [children, setChildren] = useState(initial.children);
  const [rooms, setRooms] = useState(initial.rooms);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (guestsRef.current && !guestsRef.current.contains(event.target as Node)) setGuestsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const guests = adults + children;
  const guestLabel = `${guests} Guest${guests > 1 ? 's' : ''}, ${rooms} Room${rooms > 1 ? 's' : ''}`;

  return (
    // From lg one white card holds the search and the promises; below it they
    // are two cards, as in the mobile design.
    <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-2xl lg:shadow-slate-900/20">
      <div className="max-lg:rounded-2xl max-lg:bg-white max-lg:p-4 max-lg:shadow-2xl max-lg:shadow-slate-900/20 sm:max-lg:p-6">
      <div className="flex border-b border-slate-100" role="presentation">
        <span className="inline-flex items-center gap-2 border-b-[3px] border-blue-600 px-4 pb-3 text-[15px] font-semibold text-blue-700">
          <Building2 className="h-5 w-5" aria-hidden="true" />
          Hotels
        </span>
      </div>

      <form action="/#hotels" method="get" className="mt-5 lg:rounded-xl lg:border lg:border-slate-100 lg:p-3 lg:shadow-sm">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.45fr_1fr_1fr_1.1fr_auto]">
          <label className="col-span-2 flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 focus-within:border-blue-500 lg:col-span-1">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-slate-600">Destination / Hotel Name</span>
              <input
                name="q"
                defaultValue={initial.q}
                placeholder="Enter city, hotel or landmark"
                maxLength={80}
                className="mt-1 w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </span>
            <MapPin className="h-5 w-5 shrink-0 text-slate-500 max-lg:order-first" aria-hidden="true" />
          </label>

          <DateBox
            label="Check-in"
            name="check_in"
            value={checkIn}
            min={todayISO()}
            onChange={(value) => {
              setCheckIn(value);
              if (value >= checkOut) {
                const next = new Date(`${value}T00:00:00`);
                next.setDate(next.getDate() + 1);
                setCheckOut(toISODate(next));
              }
            }}
          />
          <DateBox label="Check-out" name="check_out" value={checkOut} min={checkIn} onChange={setCheckOut} />

          <div className="relative col-span-2 lg:col-span-1" ref={guestsRef}>
            <button
              type="button"
              onClick={() => setGuestsOpen((o) => !o)}
              aria-expanded={guestsOpen}
              className="flex h-full w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-slate-300"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-slate-600">Guests &amp; Rooms</span>
                <span className="mt-1 block truncate text-[15px] font-medium text-slate-900">{guestLabel}</span>
              </span>
              <User className="h-5 w-5 shrink-0 text-slate-500 max-lg:order-first" aria-hidden="true" />
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 lg:hidden" aria-hidden="true" />
            </button>
            {guestsOpen ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 min-w-[240px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                <Stepper label="Adults" value={adults} min={1} max={12} onChange={setAdults} />
                <Stepper label="Children" value={children} min={0} max={8} onChange={setChildren} />
                <Stepper label="Rooms" value={rooms} min={1} max={6} onChange={setRooms} />
                <button type="button" onClick={() => setGuestsOpen(false)} className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                  Done
                </button>
              </div>
            ) : null}
            <input type="hidden" name="adults" value={adults} />
            <input type="hidden" name="children" value={children} />
            <input type="hidden" name="rooms" value={rooms} />
          </div>

          <button type="submit" className="col-span-2 flex items-center justify-center gap-2.5 rounded-xl bg-blue-700 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800 lg:col-span-1">
            <Search className="h-5 w-5 lg:hidden" aria-hidden="true" />
            Search Hotels
          </button>
        </div>
      </form>
      </div>

      <ul className="mt-4 grid grid-cols-2 divide-slate-100 rounded-2xl border border-slate-100 bg-white px-1 shadow-sm max-lg:divide-y-0 lg:mt-5 lg:grid-cols-4 lg:gap-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
        {PROMISES.map((p, i) => (
          <li
            key={p.title}
            className={cn(
              'flex gap-3 max-lg:px-3 max-lg:py-4',
              i % 2 === 0 && 'max-lg:border-r max-lg:border-slate-100',
              i < 2 && 'max-lg:border-b max-lg:border-slate-100',
            )}
          >
            <p.icon className={`mt-0.5 h-5 w-5 shrink-0 ${p.tint}`} aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold text-slate-800">{p.title}</span>
              <span className="block text-xs text-slate-500">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "03 Oct'26 / Saturday" over a transparent native date input. */
function DateBox({
  label,
  name,
  value,
  min,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
}) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const year = date.toLocaleDateString('en-GB', { year: '2-digit' });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });

  return (
    <label className="relative flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 sm:gap-3 sm:px-4 focus-within:border-blue-500">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-slate-600">{label}</span>
        <span className="mt-0.5 block whitespace-nowrap text-base font-medium leading-tight text-slate-900 sm:text-lg">
          {day}&apos;{year}
        </span>
        <span className="block text-xs text-slate-500">{weekday}</span>
      </span>
      <CalendarDays className="h-5 w-5 shrink-0 text-slate-500 max-lg:order-first" aria-hidden="true" />
      <input
        type="date"
        name={name}
        aria-label={`${label} date`}
        value={value}
        min={min}
        required
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
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
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40"
        >
          +
        </button>
      </span>
    </div>
  );
}
