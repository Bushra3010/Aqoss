'use client';

import { useState, useTransition } from 'react';
import { updateHotelRegistrationAction } from '@/app/admin/hotel-registration-actions';
import { Alert } from '@/components/ui';

type Status = 'NEW' | 'APPROVED' | 'REJECTED';
const ACTIONS: { status: Status; label: string }[] = [
  { status: 'APPROVED', label: 'Approve' },
  { status: 'REJECTED', label: 'Reject' },
  { status: 'NEW', label: 'Back to new' },
];

/** Status and notes for one hotel registration. */
export function HotelRegistrationControls({ id, status, notes }: { id: string; status: Status; notes: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(notes ?? '');

  const save = (next: Status) =>
    start(async () => {
      setError(null);
      const result = await updateHotelRegistrationAction(id, next, text);
      if (result.error) setError(result.error);
    });

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {error ? <Alert>{error}</Alert> : null}
      <textarea
        className="input min-h-16 text-sm"
        placeholder="Notes — e.g. called owner, documents checked"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        aria-label="Notes"
      />
      <div className="flex flex-wrap gap-2">
        {ACTIONS.filter((a) => a.status !== status).map((a) => (
          <button key={a.status} type="button" disabled={pending} onClick={() => save(a.status)} className="btn-outline py-1.5 text-sm">
            {a.label}
          </button>
        ))}
        <button type="button" disabled={pending} onClick={() => save(status)} className="btn-primary py-1.5 text-sm">
          Save notes
        </button>
      </div>
    </div>
  );
}
