import { notFound } from 'next/navigation';
import { getPublishedTenant, normalizeHostname } from '@/lib/tenant';
import { getHotelSiteData } from '@/services/hotel.service';
import { getUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { PropertyGallery } from '@/components/website/PropertyGallery';
import { AboutProperty } from '@/components/website/AboutProperty';
import { LoginPromo } from '@/components/website/LoginPromo';
import { RoomOfferCard } from '@/components/website/RoomOfferCard';
import { RatingLocationCard } from '@/components/website/RatingLocationCard';
import { OffersCard, HighlightsCard, ContactCard } from '@/components/website/SidebarExtras';
import { RoomsSection } from '@/components/website/sections/RoomsSection';
import { LocationSection } from '@/components/website/sections/LocationSection';
import { PropertyRulesSection } from '@/components/website/sections/PropertyRulesSection';
import { ReviewsSection } from '@/components/website/sections/ReviewsSection';
import { SimilarPropertiesSection } from '@/components/website/sections/SimilarPropertiesSection';

export const dynamic = 'force-dynamic';

/**
 * The hotel website (PRD §5, §6).
 *
 * Every section the navigation offers lives on this one page; the tabs scroll
 * to them and follow the reader. The booking card stays pinned alongside, so
 * the call to action is on screen wherever they have scrolled to.
 */
export default async function HotelPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenant = await getPublishedTenant();
  if (!tenant) notFound();

  const [site, user] = await Promise.all([getHotelSiteData(tenant.websiteId), getUser()]);
  if (!site) notFound();

  return (
    <div className="container-page grid gap-5 pb-12 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="min-w-0 space-y-5">
        <section
          id="overview"
          className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5"
        >
          <PropertyGallery images={site.images} alt={site.hotel.name} />

          <div className="mt-6">
            <AboutProperty description={site.hotel.description} amenities={site.amenities} />
          </div>

          {!user ? <LoginPromo /> : null}
        </section>

        <RoomsSection site={site} searchParams={searchParams} />
        <LocationSection site={site} />
        <PropertyRulesSection site={site} />
        <ReviewsSection site={site} />
        <SimilarPropertiesSection site={site} rootDomain={normalizeHostname(env.rootDomain)} />
      </div>

      {/*
       * The rail is pinned beside the content and scrolls within itself. Left
       * to scroll away with the page it would leave a column of blank space
       * the height of every section below it, and take the booking button with
       * it. Pinned, it is always beside whatever is being read.
       */}
      <aside className="booking-rail">
        <RoomOfferCard site={site} />
        <RatingLocationCard site={site} />
        <OffersCard site={site} />
        <HighlightsCard site={site} />
        <ContactCard site={site} />
      </aside>
    </div>
  );
}
