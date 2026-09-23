import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedTenant, getActivePreviewSlug } from '@/lib/tenant';
import { getHotelSiteData } from '@/services/hotel.service';
import { SiteHeader } from '@/components/website/SiteHeader';
import { SiteFooter } from '@/components/website/SiteFooter';
import { DemoBanner } from '@/components/DemoBanner';
import { BookingSearchBar } from '@/components/website/BookingSearchBar';
import { SectionTabs } from '@/components/website/SectionTabs';
import { HelpWidget } from '@/components/website/HelpWidget';
import { getUser } from '@/lib/auth/session';
import { env } from '@/lib/env';

/**
 * The common hotel website template (PRD §4, §5).
 *
 * Every hotel site in the platform renders through this one layout. The only
 * thing that varies is the tenant resolved from the request hostname, and the
 * branding it writes into CSS variables — there is no per-hotel code.
 */

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublishedTenant();
  if (!tenant) return { title: 'Hotel not found' };

  const site = await getHotelSiteData(tenant.websiteId);
  if (!site) return { title: 'Hotel not found' };

  const title = site.website.seo_title ?? `${site.hotel.name}${site.hotel.city ? ` · ${site.hotel.city}` : ''}`;
  const description =
    site.website.seo_description ??
    site.hotel.tagline ??
    site.hotel.description?.slice(0, 160) ??
    `Book your stay at ${site.hotel.name}.`;

  const cover = site.website.og_image_url ?? site.images.find((i) => i.is_cover)?.url;

  return {
    title: { absolute: title, template: `%s · ${site.hotel.name}` },
    description,
    robots: site.website.robots_indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      images: cover ? [{ url: cover }] : undefined,
      siteName: site.hotel.name,
    },
    icons: site.website.favicon_url ? { icon: site.website.favicon_url } : undefined,
    metadataBase: new URL(env.appUrl),
  };
}

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getPublishedTenant();
  if (!tenant) notFound();

  const site = await getHotelSiteData(tenant.websiteId);
  if (!site) notFound();

  const isPreview = Boolean(await getActivePreviewSlug());

  // Per-tenant palette, derived from the website's primary/accent colours.
  const brand = site.website.primary_color;
  const style = {
    '--brand-500': brand,
    '--brand-600': brand,
    '--brand-700': brand,
    '--brand-900': shade(brand, -18),
    '--brand-50': tint(brand, 92),
    '--brand-100': tint(brand, 84),
    '--accent': site.website.accent_color,
    '--page-bg': tint(brand, 96),
  } as React.CSSProperties;

  return (
    <div style={style} className="flex min-h-screen flex-col bg-[var(--page-bg)]">
      <DemoBanner />
      {isPreview ? (
        <div className="bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-950">
          Preview mode · {site.website.name} ({site.website.status}) — not visible to the public
        </div>
      ) : null}

      <SiteHeader site={site} />

      {/* The booking bar sits on every page of the template. */}
      <div className="container-page pt-4">
        <BookingSearchBar
          hotelName={site.hotel.name}
          city={site.hotel.city}
          signedIn={Boolean(await getUser())}
        />
      </div>

      {/*
       * The tab bar has to be a direct child of the page column: a sticky
       * element can only travel inside its own containing block, so nesting it
       * with the search bar would pin it to a strip two rows tall.
       */}
      <div className="sticky top-0 z-20 bg-[var(--page-bg)] py-3">
        <div className="container-page">
          <SectionTabs />
        </div>
      </div>

      <main className="flex-1 pt-2">{children}</main>

      <SiteFooter site={site} />
      <HelpWidget phone={site.hotel.phone} email={site.hotel.email} />
    </div>
  );
}

/** Darken a hex colour by `percent` (negative = darker). */
function shade(hex: string, percent: number): string {
  const { r, g, b } = parseHex(hex);
  const f = 1 + percent / 100;
  return toHex(clamp(r * f), clamp(g * f), clamp(b * f));
}

/** Mix a hex colour toward white by `percent`. */
function tint(hex: string, percent: number): string {
  const { r, g, b } = parseHex(hex);
  const p = percent / 100;
  return toHex(clamp(r + (255 - r) * p), clamp(g + (255 - g) * p), clamp(b + (255 - b) * p));
}

function parseHex(hex: string) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
