import { Stars } from '@/components/ui';
import { formatDate, initials } from '@/lib/utils';
import type { Review } from '@/types';

/** Approved guest reviews (PRD §19). */
export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return <p className="text-slate-500">No reviews yet — be the first to share your stay.</p>;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {reviews.map((review) => (
        <li key={review.id} className="card p-5">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--brand-700)' }}
              aria-hidden="true"
            >
              {initials(review.author_name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{review.author_name}</p>
                <time className="text-xs text-slate-500" dateTime={review.created_at}>
                  {formatDate(new Date(review.created_at))}
                </time>
              </div>
              <Stars rating={Number(review.rating)} className="mt-1" />
              {review.title ? (
                <p className="mt-2 font-medium text-slate-900">{review.title}</p>
              ) : null}
              {review.comment ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{review.comment}</p>
              ) : null}

              {review.admin_response ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Response from the property</p>
                  <p className="mt-1 text-sm text-slate-600">{review.admin_response}</p>
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
