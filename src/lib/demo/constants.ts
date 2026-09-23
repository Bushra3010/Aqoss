/**
 * Values shared with the edge runtime.
 *
 * Middleware runs on the edge and cannot import the demo client (it reaches
 * `node:crypto`), so anything middleware needs lives here, dependency-free.
 */

export const DEMO_SESSION_COOKIE = 'aqoss_demo_session';
