'use client';

import { useState, useTransition } from 'react';
import {
  deleteCouponAction,
  deleteOfferAction,
  deletePromotionAction,
  toggleCoupon,
  toggleOffer,
  togglePromotion,
} from '@/app/admin/offer-actions';

const TOGGLES = { offer: toggleOffer, coupon: toggleCoupon, promotion: togglePromotion };

/** Pause or re-activate an offer, coupon or promotion from its list row. */
export function ActiveToggle({ kind, id, active }: { kind: keyof typeof TOGGLES; id: string; active: boolean }) {
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
            const result = await TOGGLES[kind](id, !active);
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

/**
 * Delete an unused coupon, after a confirm. A used coupon is kept for the
 * booking history, so the button is disabled and says why.
 */
export function DeleteCouponButton({ id, code, uses }: { id: string; code: string; uses: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const used = uses > 0;

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending || used}
        title={used ? `Used ${uses} time${uses === 1 ? '' : 's'} — kept for booking history. Pause it instead.` : `Delete ${code}`}
        aria-label={used ? `${code} cannot be deleted: it has been used` : `Delete coupon ${code}`}
        className="text-sm font-medium text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:text-slate-300"
        onClick={() => {
          if (!window.confirm(`Delete coupon ${code}? Guests will no longer be able to use it. This cannot be undone.`)) return;
          start(async () => {
            setError(null);
            const result = await deleteCouponAction(id);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error ? <span className="max-w-[16rem] text-right text-xs text-rose-600" role="alert">{error}</span> : null}
    </span>
  );
}

/** Delete an offer, after a confirm. It disappears from the hotel website. */
export function DeleteOfferButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        aria-label={`Delete offer ${title}`}
        className="text-sm font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
        onClick={() => {
          if (!window.confirm(`Delete the offer "${title}"? It will be removed from the website. This cannot be undone.`)) return;
          start(async () => {
            setError(null);
            const result = await deleteOfferAction(id);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error ? <span className="max-w-[16rem] text-right text-xs text-rose-600" role="alert">{error}</span> : null}
    </span>
  );
}

/** Delete a promotion, after a confirm. Past bookings keep their price. */
export function DeletePromotionButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        aria-label={`Delete promotion ${title}`}
        className="text-sm font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
        onClick={() => {
          if (!window.confirm(`Delete the promotion "${title}"? New bookings stop getting it; past bookings keep their price.`)) return;
          start(async () => {
            setError(null);
            const result = await deletePromotionAction(id);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error ? <span className="max-w-[16rem] text-right text-xs text-rose-600" role="alert">{error}</span> : null}
    </span>
  );
}
