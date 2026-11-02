'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { updateInventory, type ActionState } from '@/app/admin/actions';
import { cn, toISODate } from '@/lib/utils';

const initial: ActionState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save for these dates'}
    </button>
  );
}

interface CalendarRow {
  room_type_id: string;
  stay_date: string;
  total_rooms: number;
  blocked_rooms: number;
  booked_rooms: number;
  is_closed: boolean;
  available: number;
}

interface Rates {
  double: number;
  single: number | null;
  extraAdult: number;
  extraChild: number;
}

interface NightRates {
  room_type_id: string;
  stay_date: string;
  double: number;
  single: number | null;
  extraAdult: number | null;
  extraChild: number | null;
}

type RateKey = 'single' | 'double' | 'extraAdult' | 'extraChild';

const RATE_ROWS: { key: RateKey; label: string }[] = [
  { key: 'single', label: '1 Pax' },
  { key: 'double', label: '2 Pax' },
  { key: 'extraAdult', label: 'Extra person' },
  { key: 'extraChild', label: 'Extra child' },
];

/**
 * One night's rate for the grid, falling back the way `room_night_rate` does:
 * the night's own rate, then the room's standard rate — and a missing 1-pax
 * rate is the 2-pax one. `set` marks a rate entered for that night.
 */
function rateFor(key: RateKey, standard: Rates, night: NightRates | undefined): { value: number; set: boolean } {
  switch (key) {
    case 'single':
      if (night?.single != null) return { value: night.single, set: true };
      if (standard.single != null) return { value: standard.single, set: false };
      return night ? { value: night.double, set: true } : { value: standard.double, set: false };
    case 'double':
      return night ? { value: night.double, set: true } : { value: standard.double, set: false };
    case 'extraAdult':
      return night?.extraAdult != null ? { value: night.extraAdult, set: true } : { value: standard.extraAdult, set: false };
    case 'extraChild':
      return night?.extraChild != null ? { value: night.extraChild, set: true } : { value: standard.extraChild, set: false };
  }
}

/** Rooms on sale and occupancy rates per night, plus a bulk update (PRD §9). */
export function InventoryEditor({
  roomTypes,
  prices,
  calendar,
  from,
  to,
  canWrite,
}: {
  roomTypes: { id: string; name: string; rates: Rates }[];
  prices: NightRates[];
  calendar: CalendarRow[];
  from: string;
  to: string;
  canWrite: boolean;
}) {
  const [state, action] = useFormState(updateInventory, initial);

  const byKey = new Map(calendar.map((r) => [`${r.room_type_id}|${r.stay_date}`, r]));
  const priceByKey = new Map(prices.map((p) => [`${p.room_type_id}|${p.stay_date}`, p]));

  const columns: string[] = [];
  for (let d = new Date(`${from}T00:00:00`); d < new Date(`${to}T00:00:00`); d.setDate(d.getDate() + 1)) {
    columns.push(toISODate(d));
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Rooms available and rates per night, by room category</caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-medium text-slate-600">
                Room category
              </th>
              {columns.map((date) => (
                <th key={date} scope="col" className="px-2 py-3 text-center font-medium text-slate-600">
                  <span className="block text-xs text-slate-400">
                    {new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                  {new Date(`${date}T00:00:00`).getDate()}
                </th>
              ))}
            </tr>
          </thead>
          {roomTypes.map((rt) => (
            <tbody key={rt.id} className="border-b border-slate-200 last:border-0">
              <tr className="bg-slate-50/60">
                <th
                  scope="rowgroup"
                  colSpan={columns.length + 1}
                  className="sticky left-0 px-4 pb-1 pt-3 text-left font-semibold text-slate-900"
                >
                  {rt.name}
                </th>
              </tr>
              <tr>
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-normal text-slate-600">
                  Inventory
                </th>
                {columns.map((date) => {
                  const row = byKey.get(`${rt.id}|${date}`);
                  const available = row?.available ?? 0;
                  const closed = row?.is_closed ?? !row;

                  return (
                    <td key={date} className="px-1 py-1.5 text-center">
                      <span
                        title={
                          row
                            ? `${available} of ${row.total_rooms} free · ${row.booked_rooms} booked${row.is_closed ? ' · stop sell' : ''}`
                            : 'Not on sale'
                        }
                        className={cn(
                          'inline-flex h-8 w-14 items-center justify-center rounded text-xs font-semibold tabular-nums',
                          closed
                            ? 'bg-slate-100 text-slate-400'
                            : available === 0
                              ? 'bg-rose-100 text-rose-700'
                              : available <= 2
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800',
                        )}
                      >
                        {closed ? '—' : available}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {RATE_ROWS.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-1.5 text-left font-normal text-slate-600">
                    {label}
                  </th>
                  {columns.map((date) => {
                    const { value, set } = rateFor(key, rt.rates, priceByKey.get(`${rt.id}|${date}`));
                    return (
                      <td
                        key={date}
                        className={cn(
                          'px-1 py-1.5 text-center text-xs tabular-nums',
                          set ? 'font-bold text-slate-900' : 'text-slate-500',
                        )}
                      >
                        {value.toLocaleString('en-IN')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}

          {roomTypes.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-slate-500">
                  This hotel has no active room types.
                </td>
              </tr>
            </tbody>
          ) : null}
        </table>
      </div>

      {canWrite && roomTypes.length ? (
        <form action={action} className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold text-slate-900">Update a date range</h2>
          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.success ? <Alert tone="success">{state.success}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Room category" htmlFor="room_type_id">
              <select id="room_type_id" name="room_type_id" className="input" required>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </Field>

            <Field label="From" htmlFor="inv-from">
              <input id="inv-from" name="from" type="date" className="input" defaultValue={from} required />
            </Field>

            <Field label="To (exclusive)" htmlFor="inv-to">
              <input id="inv-to" name="to" type="date" className="input" defaultValue={to} required />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Rate per night (₹)</legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="1 Pax" htmlFor="single_price" hint="One adult in the room.">
                <input id="single_price" name="single_price" type="number" min="0" step="0.01" className="input" />
              </Field>
              <Field label="2 Pax" htmlFor="price" hint="Two adults — the room rate.">
                <input id="price" name="price" type="number" min="0" step="0.01" className="input" />
              </Field>
              <Field label="Extra person" htmlFor="extra_adult_price" hint="Each adult over two.">
                <input id="extra_adult_price" name="extra_adult_price" type="number" min="0" step="0.01" className="input" />
              </Field>
              <Field label="Extra child" htmlFor="extra_child_price" hint="Each child.">
                <input id="extra_child_price" name="extra_child_price" type="number" min="0" step="0.01" className="input" />
              </Field>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Inventory (rooms on sale)" htmlFor="total_rooms" hint="Blank = keep current.">
              <input id="total_rooms" name="total_rooms" type="number" min="0" max="999" className="input" />
            </Field>
            <Field label="Sale" htmlFor="sale">
              <select id="sale" name="sale" className="input" defaultValue="">
                <option value="">Keep as it is</option>
                <option value="open">Open for sale</option>
                <option value="close">Stop sell</option>
              </select>
            </Field>
          </div>

          <p className="text-xs text-slate-500">
            Leave a field blank to keep what each night already has. Inventory can never drop below rooms already
            booked — the database rejects it.
          </p>

          <Submit />
        </form>
      ) : null}
    </div>
  );
}
