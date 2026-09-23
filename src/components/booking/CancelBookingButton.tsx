'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui';

/** Customer-initiated cancellation (PRD §26). Confirms before acting. */
export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const json = await response.json();
      if (!json.ok) throw new Error(json.error);

      router.refresh();
      setConfirming(false);
    } catch (err) {
      setError((err as Error).message || 'We could not cancel this booking. Please call the property.');
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" className="btn-outline" onClick={() => setConfirming(true)}>
        Cancel booking
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}

      <label className="label" htmlFor="cancel-reason">
        Reason (optional)
      </label>
      <input
        id="cancel-reason"
        className="input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Change of plans"
      />

      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={cancel} disabled={busy}>
          {busy ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
          Keep booking
        </button>
      </div>
    </div>
  );
}
