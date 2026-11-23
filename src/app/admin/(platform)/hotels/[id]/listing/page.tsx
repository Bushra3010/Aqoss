import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Circle, ExternalLink, ImageIcon, Pencil, Plus, XCircle } from 'lucide-react';
import { getAdminSession, can, canAccessHotel } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { Alert } from '@/components/ui';
import { ImageManager } from '@/components/admin/ImageManager';
import { RoomTypeForm } from '@/components/admin/RoomTypeForm';
import { ListingSteps, FormSection, StepBody } from '@/components/admin/listing/parts';
import { LinkFooter } from '@/components/admin/listing/StepFooter';
import { BasicInfoForm } from '@/components/admin/listing/BasicInfoForm';
import { LocationForm } from '@/components/admin/listing/LocationForm';
import { AmenitiesForm } from '@/components/admin/listing/AmenitiesForm';
import { PoliciesForm } from '@/components/admin/listing/PoliciesForm';
import { FinanceForm } from '@/components/admin/listing/FinanceForm';
import { PublishForm, SubmitForm } from '@/components/admin/listing/PublishForm';
import { ScrollTop } from '@/components/admin/listing/ScrollTop';
import { getListing, type Listing } from '@/services/listing.service';
import { getRoomType } from '@/services/room-type.service';
import { hotelPanelPath } from '@/lib/admin/hotel-panel';
import { websiteUrl } from '@/lib/site-url';
import {
  LISTING_STEPS,
  isListingStep,
  listingPath,
  nextStep,
  previousStep,
  propertyType,
  type ListingStepKey,
} from '@/lib/listing';
import { cn, formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'List your property · AQOSS CRM' };

type Search = { step?: string; add?: string; edit?: string; failed?: string; published?: string; submitted?: string };

/** One property's listing: every step after the first Basic Info, then Go Live. */
export default async function ListingPage({ params, searchParams }: { params: { id: string }; searchParams: Search }) {
  const session = await getAdminSession();
  // A hotel's own admins (an owner who signed up on the website, too) fill in
  // their listing; putting it live is `listings.publish` — AQOSS's call.
  if (!can(session, 'hotels.write')) return <NoAccess />;
  if (!canAccessHotel(session, params.id)) notFound();
  const canPublish = can(session, 'listings.publish');

  const listing = await getListing(params.id);
  if (!listing) notFound();

  const { hotel, website } = listing;
  // Opened without a step: the first required one still to do, else Go Live.
  const step: ListingStepKey = isListingStep(searchParams.step)
    ? searchParams.step
    : listing.missing[0] ?? 'go-live';
  const back = previousStep(step);
  const backHref = back ? listingPath(hotel.id, back) : '/admin/hotels';
  const nextHref = listingPath(hotel.id, nextStep(step));
  const live = website?.status === 'ACTIVE';
  const type = propertyType(hotel.property_type);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">
            <Link href="/admin/hotels" className="hover:underline">
              Hotels &amp; Properties
            </Link>{' '}
            / List property
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{hotel.name}</h1>
            <span
              className={cn(
                'rounded border px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                live
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : listing.submittedAt
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-amber-300 bg-amber-50 text-amber-800',
              )}
            >
              {live ? 'Live' : listing.submittedAt ? 'Awaiting approval' : 'In progress'}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {[type?.label, hotel.city].filter(Boolean).join(' · ') || 'Property listing'}
          </p>
        </div>
        <Link href={canPublish ? '/admin/hotels' : hotelPanelPath(hotel.slug)} className="btn-outline">
          Save &amp; exit
        </Link>
      </div>

      <ScrollTop watch={`${step}:${searchParams.add ?? ''}:${searchParams.edit ?? ''}`} />
      <div className="rounded-2xl border border-slate-200 bg-white">
        <ListingSteps hotelId={hotel.id} current={step} progress={listing.progress} />
        <Step step={step} listing={listing} search={searchParams} backHref={backHref} nextHref={nextHref} canPublish={canPublish} />
      </div>
    </>
  );
}

async function Step({
  step,
  listing,
  search,
  backHref,
  nextHref,
  canPublish,
}: {
  step: ListingStepKey;
  listing: Listing;
  search: Search;
  backHref: string;
  nextHref: string;
  canPublish: boolean;
}) {
  const { hotel } = listing;
  const meta = (hotel.metadata?.listing ?? {}) as Record<string, unknown>;

  switch (step) {
    case 'basic-info':
      return (
        <BasicInfoForm
          hotelId={hotel.id}
          propertyTypeKey={hotel.property_type ?? 'hotel'}
          values={{
            name: hotel.name,
            star_rating: hotel.star_rating == null ? null : Number(hotel.star_rating),
            year_built: (meta.year_built as number) ?? null,
            accepting_since: (meta.accepting_since as number) ?? null,
            channel_manager: (meta.channel_manager as string) ?? null,
            tagline: hotel.tagline,
            description: hotel.description,
            email: hotel.email,
            phone: hotel.phone,
          }}
        />
      );

    case 'location':
      return (
        <LocationForm
          hotelId={hotel.id}
          backHref={backHref}
          nearby={listing.nearby}
          values={{
            address_line1: hotel.address_line1,
            address_line2: hotel.address_line2,
            city: hotel.city,
            state: hotel.state,
            postal_code: hotel.postal_code,
            country: hotel.country,
            google_maps_url: hotel.google_maps_url,
            latitude: hotel.latitude == null ? null : Number(hotel.latitude),
            longitude: hotel.longitude == null ? null : Number(hotel.longitude),
          }}
        />
      );

    case 'amenities':
      return <AmenitiesForm hotelId={hotel.id} current={listing.amenities.map((a) => a.name)} backHref={backHref} />;

    case 'rooms':
      return <RoomsStep listing={listing} search={search} backHref={backHref} nextHref={nextHref} />;

    case 'photos':
      return (
        <>
          <StepBody
            title="Photos"
            description="Photos of the property itself — outside, reception, common areas, food. The first photo is the cover the website opens with. Room photos are added with each room."
          >
            {listing.images.length < 5 ? (
              <Alert tone="info">
                Properties with at least 5 good photos get far more bookings. {listing.images.length ? `${listing.images.length} added so far.` : ''}
              </Alert>
            ) : null}
            <ImageManager kind="hotel" ownerId={hotel.id} images={listing.images} canWrite altPrefix={hotel.name} />
          </StepBody>
          <LinkFooter backHref={backHref} nextHref={nextHref} />
        </>
      );

    case 'policies':
      return (
        <PoliciesForm
          hotelId={hotel.id}
          answers={listing.policyAnswers}
          checkIn={String(hotel.check_in_time ?? '14:00')}
          checkOut={String(hotel.check_out_time ?? '11:00')}
          backHref={backHref}
        />
      );

    case 'finance':
      return <FinanceForm hotelId={hotel.id} values={listing.legal} backHref={backHref} skipHref={nextHref} />;

    case 'go-live':
      return <GoLiveStep listing={listing} search={search} backHref={backHref} canPublish={canPublish} />;
  }
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

async function RoomsStep({ listing, search, backHref, nextHref }: { listing: Listing; search: Search; backHref: string; nextHref: string }) {
  const { hotel, roomTypes } = listing;
  const here = listingPath(hotel.id, 'rooms');
  const failed = Number(search.failed) || 0;

  const editing = search.edit ? await getRoomType(search.edit) : null;
  if (search.edit && (!editing || editing.hotel_id !== hotel.id)) notFound();

  // No rooms yet: go straight to the form, as there is nothing to list.
  if (editing || search.add === '1' || roomTypes.length === 0) {
    return (
      <StepBody
        title={editing ? `Edit ${editing.name}` : 'Add a room type'}
        description="One entry for each kind of room — e.g. Deluxe Room, Suite — with its price and how many the property has. It is bookable for the next 12 months straight away."
      >
        <RoomTypeForm
          hotel={{ id: hotel.id, name: hotel.name }}
          roomType={editing ?? undefined}
          returnBase={hotelPanelPath(hotel.slug, 'rooms')}
          cancelHref={roomTypes.length ? here : backHref}
          doneHref={here}
        />
      </StepBody>
    );
  }

  return (
    <>
      <StepBody title="Rooms" description="Each kind of room the property sells. Add another, or continue when they are all here.">
        {failed ? (
          <Alert>
            {failed} photo{failed > 1 ? 's' : ''} could not be uploaded. Add {failed > 1 ? 'them' : 'it'} again from Edit, or later in the hotel panel.
          </Alert>
        ) : null}
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {roomTypes.map((rt) => (
            <li key={rt.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{rt.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {rt.rooms} room{rt.rooms === 1 ? '' : 's'} · {formatCurrency(rt.base_price)} a night for 2 adults
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {rt.photos} photo{rt.photos === 1 ? '' : 's'}
                  </span>
                  <span className={rt.is_active ? 'text-green-700' : 'text-amber-700'}>
                    {rt.is_active ? 'Shown on the website' : 'Hidden from the website'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`${hotelPanelPath(hotel.slug, 'images/rooms')}/${rt.id}`}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Photos
                </Link>
                <Link href={`${here}&edit=${rt.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <Link href={`${here}&add=1`} className="btn-outline">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add another room type
        </Link>
      </StepBody>
      <LinkFooter backHref={backHref} nextHref={nextHref} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Go live
// ---------------------------------------------------------------------------

function GoLiveStep({
  listing,
  search,
  backHref,
  canPublish,
}: {
  listing: Listing;
  search: Search;
  backHref: string;
  canPublish: boolean;
}) {
  const { hotel, website, progress, submittedAt } = listing;
  const ready = listing.missing.length === 0;
  const sentOn = submittedAt
    ? new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const checklist = (
    <FormSection title="Checklist" description={ready ? 'Everything needed is done.' : 'Steps marked in red are needed before the website can go live.'}>
      {LISTING_STEPS.filter((s) => s.key !== 'go-live').map((s) => {
        const done = progress[s.key];
        const Icon = done ? CheckCircle2 : s.required ? XCircle : Circle;
        return (
          <div key={s.key} className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3 text-sm">
              <Icon
                className={cn('h-5 w-5 shrink-0', done ? 'text-green-600' : s.required ? 'text-rose-600' : 'text-slate-300')}
                aria-hidden="true"
              />
              <span className="font-semibold text-slate-900">{s.label}</span>
              <span className="text-slate-500">{done ? 'Done' : s.required ? 'Needed' : 'Recommended'}</span>
            </span>
            <Link href={listingPath(hotel.id, s.key)} className="text-sm font-semibold text-blue-700 hover:underline">
              {done ? 'Edit' : 'Complete'}
            </Link>
          </div>
        );
      })}
    </FormSection>
  );

  if (website?.status !== 'ACTIVE' && !canPublish) {
    return (
      <SubmitForm hotelId={hotel.id} ready={ready} submittedAt={submittedAt} backHref={backHref}>
        {search.submitted === '1' ? <Alert tone="success">Sent to AQOSS. We&apos;ll check your listing and put it live.</Alert> : null}
        {checklist}
      </SubmitForm>
    );
  }

  if (website?.status !== 'ACTIVE') {
    return (
      <PublishForm
        hotelId={hotel.id}
        slug={website?.slug ?? hotel.slug}
        ready={ready}
        backHref={backHref}
        title="Go live"
        description="Check everything is in place, choose the website address, and publish."
      >
        {sentOn ? <Alert tone="info">The owner sent this listing for approval on {sentOn}.</Alert> : null}
        {checklist}
      </PublishForm>
    );
  }

  const url = websiteUrl(website.slug);
  return (
    <StepBody title="Your website is live" description="Guests can find the property and book it online.">
      {search.published === '1' ? <Alert tone="success">{hotel.name} is live. Share the link below with guests.</Alert> : null}
      {checklist}
      <FormSection title="Website">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <a href={url} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-blue-700 hover:underline">
            {url.replace(/^https?:\/\//, '')}
          </a>
          <div className="flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="btn-primary">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open website
            </a>
            <Link href={hotelPanelPath(hotel.slug)} className="btn-outline">
              Open hotel panel
            </Link>
            <Link href={`/admin/websites/${website.id}`} className="btn-outline">
              Website settings
            </Link>
          </div>
        </div>
      </FormSection>
    </StepBody>
  );
}
