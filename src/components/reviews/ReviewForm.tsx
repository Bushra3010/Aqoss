'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Field } from '@/components/ui';

/** Review submission (PRD §19). Eligibility is enforced by the server. */
export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, rating, title, comment }),
      });

      const json = await response.json();
      if (!json.ok) throw new Error(json.error);

      setDone(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'We could not save your review. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4">
        <Alert tone="success">
          Thank you — your review has been submitted and will appear once approved.
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {error ? <Alert>{error}</Alert> : null}

      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
              className="p-1"
            >
              <svg
                viewBox="0 0 20 20"
                className={`h-7 w-7 ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.65l5.9-.85z" />
              </svg>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Title (optional)" htmlFor="review-title">
        <input
          id="review-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
        />
      </Field>

      <Field label="Your review" htmlFor="review-comment">
        <textarea
          id="review-comment"
          className="input min-h-28"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={3000}
          placeholder="What stood out about your stay?"
        />
      </Field>

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
