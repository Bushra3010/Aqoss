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
import { demoFiles, DEMO_FILES_ROUTE } from './files';

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
      from(bucket: string) {
        const key = (path: string) => `${bucket}/${path}`;
        return {
          async upload(path: string, body: Blob | ArrayBuffer | Uint8Array, options?: { contentType?: string }) {
            const bytes =
              body instanceof Blob
                ? await body.arrayBuffer()
                : body instanceof Uint8Array
                  ? body.slice().buffer
                  : body;
            const contentType =
              options?.contentType ?? (body instanceof Blob ? body.type : '') ?? 'application/octet-stream';
            demoFiles().set(key(path), { contentType: contentType || 'application/octet-stream', bytes });
            return { data: { path }, error: null };
          },
          async remove(paths: string[]) {
            for (const path of paths) demoFiles().delete(key(path));
            return { data: paths.map((name) => ({ name })), error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `${DEMO_FILES_ROUTE}/${bucket}/${path}` } };
          },
        };
      },
    },
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;
