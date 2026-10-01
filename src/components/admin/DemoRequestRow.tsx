'use client';

import { useState, useTransition } from 'react';
import { updateDemoRequestAction } from '@/app/admin/demo-request-actions';
import { Alert } from '@/components/ui';

/** Status and notes for one demo request. */
export function DemoRequestControls({
  id,
  status,
  notes,
}: {
  id: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  notes: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(notes ?? '');

  const save = (next: 'NEW' | 'CONTACTED' | 'CLOSED') =>
    start(async () => {
      setError(null);
      const result = await updateDemoRequestAction(id, next, text);
      if (result.error) setError(result.error);
    });

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {error ? <Alert>{error}</Alert> : null}
      <textarea
        className="input min-h-16 text-sm"
        placeholder="Notes — e.g. called, demo booked for Friday 4pm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        aria-label="Notes"
      />
      <div className="flex flex-wrap gap-2">
        {(['NEW', 'CONTACTED', 'CLOSED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => save(s)}
            className={s === status ? 'btn-primary py-1.5 text-sm' : 'btn-outline py-1.5 text-sm'}
          >
            {s === status ? `Save · ${s.toLowerCase()}` : `Mark ${s.toLowerCase()}`}
          </button>
        ))}
      </div>
    </div>
  );
}
