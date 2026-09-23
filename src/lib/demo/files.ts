/**
 * Uploaded files in demo mode.
 *
 * Kept in memory beside the demo tables and served by
 * `app/api/demo-files/[...path]`, so an image uploaded in the CRM shows on the
 * hotel website until the server restarts — the same lifetime as every other
 * demo write. Hangs off `globalThis` for the reason given in `store.ts`.
 */

export interface DemoFile {
  contentType: string;
  bytes: ArrayBuffer;
}

const FILES_KEY = Symbol.for('aqoss.demo.files');
type GlobalWithFiles = typeof globalThis & { [FILES_KEY]?: Map<string, DemoFile> };

export function demoFiles(): Map<string, DemoFile> {
  const g = globalThis as GlobalWithFiles;
  if (!g[FILES_KEY]) g[FILES_KEY] = new Map();
  return g[FILES_KEY]!;
}

export const DEMO_FILES_ROUTE = '/api/demo-files';
