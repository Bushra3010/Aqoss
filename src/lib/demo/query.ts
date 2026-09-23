/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory rows are untyped by design; see src/lib/demo/README */
/**
 * A small PostgREST-compatible query engine over in-memory tables.
 *
 * It implements the subset of the supabase-js builder this codebase actually
 * uses — select with embedded relations, the filter operators, order/limit,
 * insert/update/upsert/delete, and exact head counts. That is enough for every
 * service to run unchanged against demo data.
 *
 * This is a development convenience, not a database. It has no transactions,
 * no constraints and no RLS; the real guarantees live in the SQL migrations.
 */

import { randomUUID } from 'node:crypto';
import { RELATIONS } from './relations';
import { afterUpdate } from './triggers';
import type { Row, Tables } from './dataset';

export interface Result<T = any> {
  data: T;
  error: { message: string; code?: string; details?: string } | null;
  count?: number | null;
}

// ---------------------------------------------------------------------------
// select parsing
// ---------------------------------------------------------------------------

interface Embed {
  /** Key the embedded rows appear under in the result. */
  alias: string;
  /** Relation name as written, used to look up the foreign key. */
  relation: string;
  inner: boolean;
  select: ParsedSelect;
}

interface ParsedSelect {
  columns: string[];   // '*' means every column
  embeds: Embed[];
}

/**
 * Parse `id, name, hotels!inner (id, name), room_images (url, sort_order)`
 * into a tree. Handles `alias:relation` and the `!inner` modifier.
 */
export function parseSelect(select: string): ParsedSelect {
  const columns: string[] = [];
  const embeds: Embed[] = [];

  let i = 0;
  let token = '';

  const flush = () => {
    const name = token.trim();
    if (name) columns.push(name);
    token = '';
  };

  while (i < select.length) {
    const ch = select[i];

    if (ch === '(') {
      // Everything buffered so far names this embed.
      let head = token.trim();
      token = '';

      // Find the matching close paren.
      let depth = 1;
      let j = i + 1;
      while (j < select.length && depth > 0) {
        if (select[j] === '(') depth++;
        else if (select[j] === ')') depth--;
        if (depth > 0) j++;
      }
      const body = select.slice(i + 1, j);
      i = j + 1;

      // `alias:relation!inner` — alias and modifier are both optional.
      let alias = head;
      let relation = head;

      if (head.includes(':')) {
        const [left, right] = head.split(':');
        alias = left.trim();
        relation = right.trim();
      }

      const inner = relation.includes('!inner');
      relation = relation.replace('!inner', '').trim();
      alias = alias.replace('!inner', '').trim();

      // `profiles:actor_id(...)` names the FK column rather than a table;
      // fall back to the alias as the relation name in that case.
      embeds.push({ alias, relation, inner, select: parseSelect(body) });
      continue;
    }

    if (ch === ',') {
      flush();
      i++;
      continue;
    }

    token += ch;
    i++;
  }

  flush();

  return { columns, embeds };
}

// ---------------------------------------------------------------------------
// filters
// ---------------------------------------------------------------------------

type Filter = (row: Row) => boolean;

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/** Parse one PostgREST filter clause, e.g. `hotel_id.eq.abc` or `name.is.null`. */
function parseClause(clause: string): Filter {
  const firstDot = clause.indexOf('.');
  const secondDot = clause.indexOf('.', firstDot + 1);
  const column = clause.slice(0, firstDot);
  const op = clause.slice(firstDot + 1, secondDot);
  const raw = clause.slice(secondDot + 1);

  switch (op) {
    case 'eq':
      return (r) => String(r[column]) === raw;
    case 'neq':
      return (r) => String(r[column]) !== raw;
    case 'is':
      return raw === 'null' ? (r) => r[column] == null : (r) => String(r[column]) === raw;
    case 'ilike': {
      const re = likeToRegExp(raw);
      return (r) => typeof r[column] === 'string' && re.test(r[column]);
    }
    case 'gte':
      return (r) => r[column] >= raw;
    case 'lte':
      return (r) => r[column] <= raw;
    case 'gt':
      return (r) => r[column] > raw;
    case 'lt':
      return (r) => r[column] < raw;
    default:
      return () => true;
  }
}

/** Split `a.eq.1,b.is.null` on top-level commas (parenthesised groups intact). */
function splitClauses(expression: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let token = '';

  for (const ch of expression) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(token);
      token = '';
      continue;
    }
    token += ch;
  }
  if (token) out.push(token);

  return out.map((c) => c.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// the builder
// ---------------------------------------------------------------------------

type Mode = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

export class DemoQuery<T = any> implements PromiseLike<Result<T>> {
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean }[] = [];
  private limitRows: number | null = null;
  private selectStr = '*';
  private mode: Mode = 'select';
  private payload: Row[] = [];
  private onConflict: string[] = [];
  private wantCount = false;
  private headOnly = false;
  private singleMode: 'one' | 'maybe' | null = null;

  constructor(
    private tables: Tables,
    private table: string,
  ) {}

  private rows(): Row[] {
    return (this.tables[this.table] ??= []);
  }

  // ---- filters ----------------------------------------------------------

  eq(column: string, value: unknown) {
    this.filters.push((r) => (value == null ? r[column] == null : String(r[column]) === String(value)));
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((r) => String(r[column]) !== String(value));
    return this;
  }

  in(column: string, values: unknown[]) {
    const set = new Set((values ?? []).map(String));
    this.filters.push((r) => set.has(String(r[column])));
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((r) => r[column] != null && r[column] >= value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((r) => r[column] != null && r[column] <= value);
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((r) => r[column] != null && r[column] > value);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((r) => r[column] != null && r[column] < value);
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push((r) => (value === null ? r[column] == null : r[column] === value));
    return this;
  }

  ilike(column: string, pattern: string) {
    const re = likeToRegExp(pattern);
    this.filters.push((r) => typeof r[column] === 'string' && re.test(r[column]));
    return this;
  }

  /** `.or('hotel_id.eq.x,hotel_id.is.null')` — any clause may match. */
  or(expression: string) {
    const clauses = splitClauses(expression).map(parseClause);
    this.filters.push((r) => clauses.some((f) => f(r)));
    return this;
  }

  // ---- shaping ----------------------------------------------------------

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitRows = n;
    return this;
  }

  range(from: number, to: number) {
    this.limitRows = to - from + 1;
    return this;
  }

  select(select = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectStr = select;
    if (options?.count) this.wantCount = true;
    if (options?.head) this.headOnly = true;
    if (this.mode === 'select' && this.payload.length === 0) this.mode = 'select';
    return this;
  }

  single() {
    this.singleMode = 'one';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  // ---- writes -----------------------------------------------------------

  insert(rows: Row | Row[]) {
    this.mode = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Row) {
    this.mode = 'update';
    this.payload = [patch];
    return this;
  }

  upsert(rows: Row | Row[], options?: { onConflict?: string }) {
    this.mode = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.onConflict = (options?.onConflict ?? 'id').split(',').map((c) => c.trim());
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  // ---- execution --------------------------------------------------------

  private matching(): Row[] {
    return this.rows().filter((row) => this.filters.every((f) => f(row)));
  }

  private sortAndSlice(rows: Row[]): Row[] {
    let out = rows;

    if (this.orderBy.length) {
      out = [...out].sort((a, b) => {
        for (const { column, ascending } of this.orderBy) {
          const av = a[column];
          const bv = b[column];
          if (av === bv) continue;
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp = av < bv ? -1 : 1;
          return ascending ? cmp : -cmp;
        }
        return 0;
      });
    }

    if (this.limitRows != null) out = out.slice(0, this.limitRows);
    return out;
  }

  private run(): Result<any> {
    try {
      switch (this.mode) {
        case 'insert':
          return this.runInsert();
        case 'update':
          return this.runUpdate();
        case 'upsert':
          return this.runUpsert();
        case 'delete':
          return this.runDelete();
        default:
          return this.runSelect();
      }
    } catch (err) {
      return { data: null, error: { message: (err as Error).message }, count: null };
    }
  }

  private shape(rows: Row[]): Result<any> {
    const parsed = parseSelect(this.selectStr);
    const projected = rows
      .map((row) => project(this.tables, this.table, row, parsed))
      .filter((r): r is Row => r !== null);

    if (this.singleMode) {
      if (projected.length === 0) {
        return this.singleMode === 'one'
          ? { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
          : { data: null, error: null };
      }
      return { data: projected[0], error: null };
    }

    return { data: projected, error: null };
  }

  private runSelect(): Result<any> {
    const matched = this.matching();

    if (this.headOnly) {
      return { data: null, error: null, count: matched.length };
    }

    const result = this.shape(this.sortAndSlice(matched));
    if (this.wantCount) result.count = matched.length;
    return result;
  }

  private runInsert(): Result<any> {
    const inserted = this.payload.map((row) => {
      const record: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
      this.rows().push(record);
      return record;
    });

    return this.shape(inserted);
  }

  private runUpdate(): Result<any> {
    const patch = this.payload[0] ?? {};
    // `undefined` means "leave alone", matching how the services build patches.
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));

    const updated = this.matching().map((row) => {
      const before = { ...row };
      Object.assign(row, clean, { updated_at: new Date().toISOString() });
      afterUpdate(this.tables, this.table, before, row);
      return row;
    });

    return this.shape(updated);
  }

  private runUpsert(): Result<any> {
    const written = this.payload.map((row) => {
      const existing = this.rows().find((candidate) =>
        this.onConflict.every((key) => String(candidate[key]) === String(row[key])),
      );

      if (existing) {
        Object.assign(existing, row, { updated_at: new Date().toISOString() });
        return existing;
      }

      const record: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
      this.rows().push(record);
      return record;
    });

    return this.shape(written);
  }

  private runDelete(): Result<any> {
    const doomed = new Set(this.matching());
    this.tables[this.table] = this.rows().filter((row) => !doomed.has(row));
    return this.shape([...doomed]);
  }

  /** Awaiting the builder runs it, exactly like supabase-js. */
  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run() as Result<T>).then(onfulfilled, onrejected);
  }
}

// ---------------------------------------------------------------------------
// projection + embedding
// ---------------------------------------------------------------------------

function project(tables: Tables, table: string, row: Row, select: ParsedSelect): Row | null {
  const takeAll = select.columns.includes('*') || select.columns.length === 0;

  const out: Row = takeAll
    ? { ...row }
    : Object.fromEntries(select.columns.map((c) => [c, row[c]]));

  for (const embed of select.embeds) {
    const relations = RELATIONS[table] ?? {};
    // Prefer the relation name; fall back to the alias for `alias:fk(...)`.
    const relation = relations[embed.relation] ?? relations[embed.alias];

    if (!relation) {
      out[embed.alias] = embed.inner ? undefined : null;
      continue;
    }

    const childRows = tables[relation.table] ?? [];

    if (relation.type === 'one') {
      const parentKey = row[relation.fk];
      const match = parentKey == null
        ? undefined
        : childRows.find((c) => String(c.id) === String(parentKey));

      if (!match) {
        if (embed.inner) return null;   // !inner drops the parent row
        out[embed.alias] = null;
        continue;
      }

      out[embed.alias] = project(tables, relation.table, match, embed.select);
    } else {
      const matches = childRows
        .filter((c) => String(c[relation.fk]) === String(row.id))
        .map((c) => project(tables, relation.table, c, embed.select))
        .filter((c): c is Row => c !== null);

      if (embed.inner && matches.length === 0) return null;
      out[embed.alias] = matches;
    }
  }

  return out;
}
