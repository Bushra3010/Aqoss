import { isDemoMode } from '@/lib/env';

/**
 * A standing reminder that this is demo data, with a way back to the
 * directory. Renders nothing when a real database is connected.
 */
export function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="bg-slate-900 px-4 py-1.5 text-center text-xs text-slate-300">
      Demo mode · in-memory sample data for local development, resets on restart
    </div>
  );
}
