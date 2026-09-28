/**
 * Where a hotel website lives: its own subdomain of the platform domain,
 * e.g. https://the-serenity-inn-goa.aqoss.com (http://….localhost:3000 in dev).
 *
 * `resolveTenantByHost` maps that subdomain back to the website by slug, so no
 * per-hotel DNS or domain row is needed — only a wildcard `*.aqoss.com` record
 * pointing at the app. Safe in client components: it reads only public env.
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PROTOCOL = APP_URL.startsWith('https:') ? 'https:' : 'http:';

/** The platform domain with any port and `www.` removed, e.g. `aqoss.com`. */
export const platformHost = ROOT_DOMAIN.toLowerCase().split(':')[0].replace(/^www\./, '');

/** Hostname of a website's subdomain, as stored in `website_domains`. */
export function websiteHost(slug: string): string {
  return `${slug}.${platformHost}`;
}

/** Public address of a website, port included in dev. */
export function websiteUrl(slug: string): string {
  return `${PROTOCOL}//${slug}.${ROOT_DOMAIN.replace(/^www\./, '')}`;
}

/**
 * Link for staff to open a website. Published sites open at their real
 * address. Unpublished ones can only be seen by a signed-in admin, whose
 * session lives on the main domain, so they preview there instead.
 */
export function websiteAdminUrl(slug: string, status: string): string {
  return status === 'ACTIVE' ? websiteUrl(slug) : `${APP_URL}/?preview_site=${encodeURIComponent(slug)}`;
}
