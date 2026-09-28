/**
 * Regenerates src/lib/demo/defaults.ts from the column defaults in
 * supabase/migrations, so the in-memory demo database fills omitted columns
 * exactly like Postgres does. Run after a migration adds or changes a default:
 *
 *   npm run demo:defaults
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'supabase/migrations');
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(dir, f), 'utf8'))
  .join('\n');

type Value = string | number | boolean | null | Record<string, never> | never[] | { now: true };
const tables: Record<string, Record<string, Value>> = {};
const skipped: string[] = [];

for (const m of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
  const [, table, body] = m;
  const cols: Record<string, Value> = {};

  for (const raw of body.split('\n')) {
    // Drop a trailing comment, then the column's trailing comma.
    const line = raw.replace(/\s*--.*$/, '').trim().replace(/,$/, '');
    const cm = line.match(/^(\w+)\s+.*?\bdefault\s+(.+?)(\s+check\b.*|\s+references\b.*|\s+unique\b.*)?$/i);
    if (!cm) continue;
    const [, col, def] = cm;
    const d = def.trim();
    if (col === 'id' || d.startsWith('gen_random_uuid') || d.startsWith('public.next_')) continue;

    if (d === 'now()') cols[col] = { now: true };
    else if (d === 'true' || d === 'false') cols[col] = d === 'true';
    else if (/^-?\d+(\.\d+)?$/.test(d)) cols[col] = Number(d);
    else if (d === "'{}'::jsonb") cols[col] = {};
    else if (d === "'[]'::jsonb" || /^'\{\}'::\w+\[\]$/.test(d)) cols[col] = [];
    else if (/^'[^']*'(::\w+)?$/.test(d)) cols[col] = d.match(/^'([^']*)'/)![1];
    else skipped.push(`${table}.${col} = ${d}`);
  }
  if (Object.keys(cols).length) tables[table] = cols;
}

const body = JSON.stringify(tables, null, 2).replace(/\{\s*"now": true\s*\}/g, 'NOW');
writeFileSync(
  join(process.cwd(), 'src/lib/demo/defaults.ts'),
  `/**
 * Column defaults, generated from supabase/migrations by
 * scripts/generate-demo-defaults.ts — do not edit by hand; run
 * \`npm run demo:defaults\` after a migration changes a default.
 *
 * Postgres fills an omitted column from its default; the demo query engine
 * applies these on insert so rows look the same either way (a notification
 * without \`state\` once crashed the Notifications page).
 */

/** Marker for \`default now()\`, resolved at insert time. */
export const NOW = Symbol('now');

type Default = string | number | boolean | null | typeof NOW | Record<string, never> | never[];

const DEFAULTS: Record<string, Record<string, Default>> = ${body};

/** Fresh defaults for one new row of \`table\` (arrays and objects are never shared). */
export function defaultsFor(table: string): Record<string, unknown> {
  const now = new Date().toISOString();
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(DEFAULTS[table] ?? {})) {
    out[column] = value === NOW ? now : Array.isArray(value) ? [] : value && typeof value === 'object' ? {} : value;
  }
  return out;
}
`,
);

console.log(`Wrote defaults for ${Object.keys(tables).length} tables.`);
if (skipped.length) console.log(`Skipped (not a literal):\n  ${skipped.join('\n  ')}`);
