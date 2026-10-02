import { createHash } from 'node:crypto';

/**
 * Deterministic ids for the seeded demo dataset.
 *
 * Serverless hosts (Netlify, Vercel) run several instances, each building its
 * own in-memory dataset. With random ids, a session cookie or a link written
 * by one instance named rows that did not exist on the next — a signed-in
 * super admin got "No access" on alternate requests. Seeding from a counter
 * makes every instance build the same ids in the same order.
 *
 * Only the build uses this; rows written at runtime keep `randomUUID()`.
 */
let counter = 0;

export function resetSeedIds(): void {
  counter = 0;
}

export function seedId(): string {
  const h = createHash('sha256').update(`aqoss-demo:${counter++}`).digest('hex');
  // Shaped as a v4 UUID so anything validating the format accepts it.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
