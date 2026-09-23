'use client';

import { useState, useTransition } from 'react';
import { toggleCoupon, toggleOffer } from '@/app/admin/offer-actions';

/** Pause or re-activate an offer or coupon from its list row. */
export function ActiveToggle({ kind, id, active }: { kind: 'offer' | 'coupon'; id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await (kind === 'offer' ? toggleOffer : toggleCoupon)(id, !active);
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? 'Saving…' : active ? 'Pause' : 'Activate'}
      </button>
      {error ? <span className="text-xs text-rose-600" role="alert">{error}</span> : null}
    </span>
  );
}
