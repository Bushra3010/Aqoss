'use client';

import { useEffect } from 'react';

/**
 * Customer-facing error boundary (PRD §49): a clear message, never a stack
 * trace. The detail is logged for us, not shown to the guest.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[aqoss] page error', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-600">
          We could not load this page. Please try again — if it keeps happening, contact the
          property directly.
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
