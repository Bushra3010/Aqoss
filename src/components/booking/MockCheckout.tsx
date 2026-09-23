'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

/**
 * Test checkout for the mock gateway.
 *
 * It does not touch card details — the server signs a fake payment and the
 * ordinary verification path decides whether the booking is confirmed. The
 * "simulate failure" button sends a bad signature so the rejection path is
 * testable too.
 */
export function MockCheckout({
  paymentId,
  orderId,
  amount,
  reference,
}: {
  paymentId: string;
  orderId: string;
  amount: number;
  reference: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(fail: boolean) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/mock-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, order_id: orderId, amount, fail }),
      });

      const json = await response.json();
      if (!json.ok) throw new Error(json.error);

      router.push(`/booking/confirmation/${json.data.reference}`);
    } catch (err) {
      setError((err as Error).message || 'Payment failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Test gateway</p>
        <p className="mt-1">
          No real payment is taken. The server signs the transaction and verifies it exactly as a
          live gateway would.
        </p>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-accent flex-1" onClick={() => pay(false)} disabled={busy}>
          {busy ? 'Processing…' : `Pay ${formatCurrency(amount)}`}
        </button>
        <button type="button" className="btn-outline" onClick={() => pay(true)} disabled={busy}>
          Simulate failure
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400">Reference {reference}</p>
    </div>
  );
}
