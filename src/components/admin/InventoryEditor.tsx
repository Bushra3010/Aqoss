'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Alert, Field } from '@/components/ui';
import { updateInventory, type ActionState } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

const initial: ActionState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Applying…' : 'Apply to date range'}
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

/** Availability grid + bulk update (PRD §9). */
export function InventoryEditor({
  roomTypes,
  calendar,
  from,
  to,
  canWrite,
}: {
  roomTypes: { id: string; name: string }[];
  calendar: CalendarRow[];
  from: string;
  to: string;
  canWrite: boolean;
}) {
  const [state, action] = useFormState(updateInventory, initial);

  const dates = [...new Set(calendar.map((r) => r.stay_date))].sort();
  const byKey = new Map(calendar.map((r) => [`${r.room_type_id}|${r.stay_date}`, r]));

  // When no inventory exists yet, still show the date columns so the grid reads
  // as "nothing on sale" rather than as an empty page.
  const columns = dates.length
    ? dates
    : (() => {
        const out: string[] = [];
        for (let d = new Date(`${from}T00:00:00`); d < new Date(`${to}T00:00:00`); d.setDate(d.getDate() + 1)) {
          out.push(d.toISOString().slice(0, 10));
        }
        return out;
      })();

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Rooms available per night</caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-medium text-slate-600">
                Room type
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
          <tbody className="divide-y divide-slate-200">
            {roomTypes.map((rt) => (
              <tr key={rt.id}>
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-slate-900">
                  {rt.name}
                </th>
                {columns.map((date) => {
                  const row = byKey.get(`${rt.id}|${date}`);
                  const available = row?.available ?? 0;
                  const closed = row?.is_closed ?? !row;

                  return (
                    <td key={date} className="px-1 py-2 text-center">
                      <span
                        title={
                          row
                            ? `${available} of ${row.total_rooms} free · ${row.booked_rooms} booked`
                            : 'Not on sale'
                        }
                        className={cn(
                          'inline-flex h-8 w-9 items-center justify-center rounded text-xs font-semibold tabular-nums',
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
            ))}

            {roomTypes.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-slate-500">
                  This hotel has no active room types.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {canWrite && roomTypes.length ? (
        <form action={action} className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold text-slate-900">Update a date range</h2>
          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.success ? <Alert tone="success">{state.success}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Room type" htmlFor="room_type_id">
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

            <Field label="Rooms on sale" htmlFor="total_rooms" hint="Blank = physical room count.">
              <input id="total_rooms" name="total_rooms" type="number" min="0" max="999" className="input" />
            </Field>

            <Field label="Nightly rate" htmlFor="price" hint="Blank = keep current rate.">
              <input id="price" name="price" type="number" min="0" step="0.01" className="input" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_closed" className="h-4 w-4 rounded border-slate-300" />
            Stop sell (close these dates)
          </label>

          <p className="text-xs text-slate-500">
            Allocation can never drop below rooms already booked — the database rejects it.
          </p>

          <Submit />
        </form>
      ) : null}
    </div>
  );
}
