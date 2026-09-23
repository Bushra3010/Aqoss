import { ReviewList } from '@/components/reviews/ReviewList';
import { Stars } from '@/components/ui';
import type { HotelSiteData } from '@/types';

/** User reviews (PRD §19). Only APPROVED reviews reach here. */
export function ReviewsSection({ site }: { site: HotelSiteData }) {
  const { reviews, reviewSummary } = site;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(Number(r.rating)) === star).length,
  }));

  return (
    <section
      id="user-reviews"
      className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-xl font-bold text-slate-900">User reviews</h2>

      {reviewSummary.count > 0 ? (
        <>
          <div className="mt-4 flex flex-col gap-6 rounded-xl bg-slate-50 p-5 sm:flex-row sm:items-center">
            <div className="text-center sm:w-40">
              <p className="text-4xl font-bold text-slate-900">{reviewSummary.average}</p>
              <Stars rating={reviewSummary.average} className="mt-1.5 justify-center" />
              <p className="mt-1 text-sm text-slate-500">
                {reviewSummary.count} review{reviewSummary.count > 1 ? 's' : ''}
              </p>
            </div>

            <ul className="flex-1 space-y-1.5">
              {distribution.map(({ star, count }) => (
                <li key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 text-slate-600">{star}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${reviewSummary.count ? (count / reviewSummary.count) * 100 : 0}%`,
                        backgroundColor: 'var(--brand-700)',
                      }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-slate-500">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <ReviewList reviews={reviews.slice(0, 6)} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No reviews yet — be the first to share your stay.
        </p>
      )}
    </section>
  );
}
