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

/** Where hotels live when they can't have a subdomain: `/site/<slug>`. */
export const SITE_PATH_PREFIX = '/site';

/**
 * Hosting such as `*.netlify.app` gives the platform one name and no
 * subdomains under it (no DNS, no certificate), so there each hotel is served
 * at `<main domain>/site/<slug>` instead. Force either way with
 * NEXT_PUBLIC_HOTEL_URLS=path|subdomain; a custom domain with a wildcard
 * record should use subdomains.
 */
export const hotelsOnPaths =
  process.env.NEXT_PUBLIC_HOTEL_URLS === 'path' ||
  (process.env.NEXT_PUBLIC_HOTEL_URLS !== 'subdomain' && /\.(netlify|vercel)\.app$/.test(platformHost));

/** Public address of a website, port included in dev. */
export function websiteUrl(slug: string): string {
  if (hotelsOnPaths) return `${APP_URL.replace(/\/$/, '')}${SITE_PATH_PREFIX}/${slug}`;
  return `${PROTOCOL}//${slug}.${ROOT_DOMAIN.replace(/^www\./, '')}`;
}

/**
 * A link to the hotel's home page from inside its own website. `base` is ''
 * on a subdomain and `/site/<slug>` on the main domain (see `getSiteBase`);
 * `suffix` is a query and/or hash, e.g. `#rooms`.
 */
export function siteHome(base: string, suffix = ''): string {
  return base ? `${base}${suffix}` : `/${suffix}`;
}

/**
 * Link for staff to open a website. Published sites open at their real
 * address. Unpublished ones can only be seen by a signed-in admin, whose
 * session lives on the main domain, so they preview there instead.
 */
export function websiteAdminUrl(slug: string, status: string): string {
  return status === 'ACTIVE' ? websiteUrl(slug) : `${APP_URL}/?preview_site=${encodeURIComponent(slug)}`;
}

/**
 * Is this request for the main domain itself — the AQOSS website — rather
 * than a hotel's subdomain? `aqoss.com`, `www.aqoss.com`, and in dev plain
 * `localhost` / `127.0.0.1`. Edge-safe (middleware uses it).
 */
export function isPlatformHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().split(':')[0].replace(/^www\./, '');
  return host === platformHost || host === 'localhost' || host === '127.0.0.1';
}
