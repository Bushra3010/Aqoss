/**
 * A typed search term made safe to put inside a PostgREST `or()` filter as an
 * `ilike` pattern. Commas, brackets and quotes would end the filter early (or
 * add conditions), and `%`/`*`/`\` would act as wildcards, so they become
 * spaces. Returns null when nothing searchable is left.
 */
export function ilikeTerm(raw: string | undefined | null): string | null {
  const cleaned = (raw ?? '').replace(/[,()"'%*\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return cleaned ? `%${cleaned}%` : null;
}
