/**
 * PLACEHOLDER — replace with types generated from your schema.
 *
 * Once your Supabase project is linked:
 *
 *     npm run db:types
 *     # supabase gen types typescript --local > src/types/supabase.ts
 *
 * That overwrites this file with a real `Database` interface, and every
 * `.from()` / `.rpc()` call in the app becomes fully typed with no other
 * changes — the clients already pass this type as their generic.
 *
 * Until then it is `any`, so queries compile but rows are untyped. Lean on the
 * hand-written domain types in `src/types/index.ts` at the boundaries; the
 * services already cast query results to them.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = any;
