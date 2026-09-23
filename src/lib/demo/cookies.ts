import { cookies } from 'next/headers';
import type { CookieStore } from './auth';

/**
 * Cookie adapters for the contexts the demo client runs in.
 *
 * Server Components cannot write cookies, so writes there are swallowed —
 * the same thing `@supabase/ssr` does with its own server client.
 */

/** Backed by `next/headers`, for server components, actions and route handlers. */
export function nextCookieStore(): CookieStore {
  return {
    get(name) {
      try {
        return cookies().get(name)?.value;
      } catch {
        return undefined;
      }
    },
    set(name, value) {
      try {
        cookies().set(name, value, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
      } catch {
        // Read-only context (a Server Component); nothing to do.
      }
    },
    remove(name) {
      try {
        cookies().delete(name);
      } catch {
        // As above.
      }
    },
  };
}

/** Backed by a middleware request/response pair. */
export function middlewareCookieStore(
  request: { cookies: { get(name: string): { value: string } | undefined } },
  response: { cookies: { set(name: string, value: string, options?: object): void; delete(name: string): void } },
): CookieStore {
  return {
    get: (name) => request.cookies.get(name)?.value,
    set: (name, value) =>
      response.cookies.set(name, value, { httpOnly: true, sameSite: 'lax', path: '/' }),
    remove: (name) => response.cookies.delete(name),
  };
}
