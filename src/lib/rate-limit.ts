import { AppError } from '@/lib/api';

/**
 * In-memory fixed-window rate limiter (PRD §42).
 *
 * Good enough for a single instance and for local development. On Vercel each
 * lambda keeps its own counters, so before going to production swap the store
 * for Redis/Upstash — the call sites do not need to change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitOptions {
  /** Requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size > MAX_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Throws a 429-shaped AppError when the caller is over the limit. */
export function enforceRateLimit(key: string, options: RateLimitOptions) {
  const result = rateLimit(key, options);
  if (!result.allowed) {
    throw new AppError('Too many requests. Please wait a moment and try again.', 429, 'RATE_LIMIT');
  }
  return result;
}

/** Best-effort client identity for rate-limit keys. */
export function clientKey(request: Request, scope: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  return `${scope}:${ip}`;
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
