import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedTenant } from '@/lib/tenant';
import { getHotelSiteData } from '@/services/hotel.service';
import { RoomsSection } from '@/components/website/sections/RoomsSection';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rooms' };

/**
 * Standalone URL for this section (PRD §45).
 *
 * The website itself is one page — these routes exist so each section has a
 * crawlable, linkable address of its own, and render the very same component.
 */
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenant = await getPublishedTenant();
  if (!tenant) notFound();

  const site = await getHotelSiteData(tenant.websiteId);
  if (!site) notFound();

  return (
    <div className="container-page pb-12">
      <RoomsSection site={site} searchParams={searchParams} />

      <Link
        href="/#rooms"
        className="mt-5 inline-block text-sm font-medium"
        style={{ color: 'var(--brand-700)' }}
      >
        ← Back to {site.hotel.name}
      </Link>
    </div>
  );
}
