/**
 * A stand-in for the Supabase client, backed by the in-memory demo data.
 *
 * It exposes the same surface the services use — `.from()`, `.rpc()`, `.auth`
 * and a minimal `.storage` — so nothing above this file knows the difference.
 * Swapping it in happens in `src/lib/supabase/*`, which is the only place that
 * decides which client to hand out.
 */

import { DemoQuery } from './query';
import { createRpc } from './rpc';
import { createDemoAuth, NOOP_COOKIES, type CookieStore } from './auth';
import { getTables } from './store';

export function createDemoClient(cookies: CookieStore = NOOP_COOKIES) {
  const tables = getTables();
  const rpc = createRpc(tables);

  return {
    from(table: string) {
      return new DemoQuery(tables, table);
    },

    rpc(name: string, args: Record<string, unknown> = {}) {
      return rpc(name, args);
    },

    auth: createDemoAuth(cookies),

    storage: {
      from() {
        return {
          async upload() {
            return {
              data: null,
              error: { message: 'File uploads are unavailable in demo mode.' },
            };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://picsum.photos/seed/${encodeURIComponent(path)}/800/600` } };
          },
        };
      },
    },
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;
