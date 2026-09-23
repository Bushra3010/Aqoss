import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { env, isDemoMode } from '@/lib/env';
import { createDemoClient } from '@/lib/demo/client';
import { nextCookieStore } from '@/lib/demo/cookies';

/**
 * Server client bound to the request's cookies.
 * Runs as the signed-in user, so every query is still subject to RLS.
 */
export function createServerSupabase() {
  if (isDemoMode) {
    return createDemoClient(nextCookieStore()) as unknown as ReturnType<
      typeof createServerClient<Database>
    >;
  }

  const cookieStore = cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by middleware instead.
        }
      },
    },
  });
}
