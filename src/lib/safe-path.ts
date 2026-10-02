/**
 * A `?redirect=` / `next` value reduced to a path on this site. Anything else
 * — `https://…`, protocol-relative `//host`, `/\\host` — falls back, so a
 * crafted sign-in link can't send someone to another site afterwards.
 */
export function safeLocalPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
