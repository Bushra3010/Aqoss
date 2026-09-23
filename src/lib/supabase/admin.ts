import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { env, isDemoMode } from '@/lib/env';
import { createDemoClient } from '@/lib/demo/client';

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client: bypasses RLS entirely.
 *
 * Only for trusted server code that has already authorised the caller —
 * the booking transaction, payment webhooks, the notification worker and the
 * seeder. Never expose its results to a client without filtering them first.
 */
export function createAdminSupabase() {
  // Demo mode: an in-memory stand-in with the same surface (see src/lib/demo).
  if (isDemoMode) return createDemoClient() as unknown as ReturnType<typeof createClient<Database>>;

  if (!cached) {
    cached = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}
