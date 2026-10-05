/**
 * Menus of the AQOSS website. Plain data, no React — middleware imports
 * `PLATFORM_PAGES` on the edge.
 */

/** One page per solution, at `/<slug>` on the main domain. */
export const SOLUTION_SLUGS = ['ai-website', 'ai-marketing', 'ai-sales', 'booking-engine', 'reputation'] as const;
export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

/**
 * Main-domain paths middleware rewrites to `/platform/<path>`. Hotel
 * subdomains never see them: there they are an ordinary 404.
 */
export const PLATFORM_PAGES: readonly string[] = [...SOLUTION_SLUGS, 'about'];

export const NAV = [
  { href: '/ai-website', label: 'AI Website' },
  { href: '/ai-marketing', label: 'AI Marketing' },
  { href: '/ai-sales', label: 'AI Sales' },
  { href: '/booking-engine', label: 'Booking Engine' },
  { href: '/reputation', label: 'Reputation' },
];

/** Solutions shown in the header; the footer lists all of `NAV`. */
const HIDDEN_FROM_HEADER = ['/booking-engine', '/reputation'];
export const HEADER_NAV = NAV.filter((item) => !HIDDEN_FROM_HEADER.includes(item.href));

/** The header's "Resources" menu — sections of the home page. */
export const RESOURCES = [
  { href: '/#offers', label: 'Offers & deals', text: 'Current offers from AQOSS hotels' },
  { href: '/#hotels', label: 'Hotels on AQOSS', text: 'Browse the websites we run' },
  { href: '/#why-aqoss', label: 'Why AQOSS', text: 'What hotels get from the platform' },
  { href: '/#book-demo', label: 'Book a demo', text: 'See AQOSS with your hotel in mind' },
];

export const ABOUT = { href: '/about', label: 'About Us' };
