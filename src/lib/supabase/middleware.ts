import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { env } from '@/lib/env';

/**
 * Supabase client for middleware. Refreshes the auth cookie on every request
 * and writes the updated cookies onto the outgoing response.
 */
export function createMiddlewareSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
}
