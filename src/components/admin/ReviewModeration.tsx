'use client';

import { useState, useTransition } from 'react';
import { Alert, Stars, StatusBadge, EmptyState } from '@/components/ui';
import { adminModerateReview } from '@/app/admin/actions';
import { formatDate } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ReviewModeration({
  reviews,
  canModerate,
}: {
  reviews: any[];
  canModerate: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  function run(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        setResponding(null);
        setResponse('');
      } catch (err) {
        setError((err as Error).message || 'That action could not be completed.');
      }
    });
  }

  if (!reviews.length) {
    return <EmptyState title="Nothing to moderate" description="No reviews with this status." />;
  }

  return (
    <div className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}

      {reviews.map((review) => {
        const hotel = Array.isArray(review.hotels) ? review.hotels[0] : review.hotels;

        return (
          <article key={review.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{review.author_name}</p>
                <p className="text-xs text-slate-500">
                  {hotel?.name} · {formatDate(new Date(review.created_at))}
                </p>
                <Stars rating={Number(review.rating)} className="mt-1.5" />
              </div>
              <StatusBadge status={review.status} />
            </div>

            {review.title ? <p className="mt-3 font-medium text-slate-900">{review.title}</p> : null}
            {review.comment ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{review.comment}</p>
            ) : null}

            {review.admin_response ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Property response</p>
                <p className="mt-1 text-sm text-slate-600">{review.admin_response}</p>
              </div>
            ) : null}

            {canModerate ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                {review.status !== 'APPROVED' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={pending}
                    onClick={() => run(() => adminModerateReview(review.id, 'APPROVED'))}
                  >
                    Approve
                  </button>
                ) : null}

                {review.status !== 'HIDDEN' ? (
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={pending}
                    onClick={() => run(() => adminModerateReview(review.id, 'HIDDEN'))}
                  >
                    Hide
                  </button>
                ) : null}

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setResponse(review.admin_response ?? '');
                    setResponding(responding === review.id ? null : review.id);
                  }}
                >
                  {review.admin_response ? 'Edit response' : 'Respond'}
                </button>
              </div>
            ) : null}

            {responding === review.id ? (
              <div className="mt-3 space-y-2">
                <label className="label" htmlFor={`response-${review.id}`}>
                  Public response
                </label>
                <textarea
                  id={`response-${review.id}`}
                  className="input min-h-24"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Thank you for staying with us…"
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending || !response.trim()}
                  onClick={() => run(() => adminModerateReview(review.id, review.status, response))}
                >
                  {pending ? 'Saving…' : 'Post response'}
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
