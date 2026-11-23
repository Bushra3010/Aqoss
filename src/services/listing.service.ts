import 'server-only';

import type { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { recordAudit } from '@/services/audit.service';
import { AppError } from '@/lib/api';
import { formatTime, slugify } from '@/lib/utils';
import {
  DEFAULT_POLICY_ANSWERS,
  LISTING_STEPS,
  type ListingStepKey,
  type PolicyAnswers,
} from '@/lib/listing';
import type {
  basicInfoSchema,
  financeSchema,
  locationSchema,
  nearbyPlaceSchema,
  policiesSchema,
} from '@/lib/validation/listing';

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type NearbyInput = z.infer<typeof nearbyPlaceSchema>;
export type PoliciesInput = z.infer<typeof policiesSchema>;
export type FinanceInput = z.infer<typeof financeSchema>;

/** What a listing page needs: the hotel, its website, and every step's data. */
export interface Listing {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  hotel: Record<string, any> & { id: string; name: string; slug: string; status: string };
  website: { id: string; name: string; slug: string; status: string; published_at: string | null } | null;
  roomTypes: { id: string; name: string; base_price: number; is_active: boolean; rooms: number; photos: number }[];
  images: { id: string; url: string; alt_text: string | null; is_cover: boolean }[];
  amenities: { name: string; category: string | null }[];
  nearby: { place_type: string; name: string; distance_km: number | null }[];
  policyCount: number;
  policyAnswers: PolicyAnswers;
  legal: Record<string, string | null> | null;
  /** Which steps hold enough to count as done — derived, never stored. */
  progress: Record<ListingStepKey, boolean>;
  /** Required steps still missing before the website can go live. */
  missing: ListingStepKey[];
  /** When the hotel's own admin (an owner) sent it to AQOSS for approval. */
  submittedAt: string | null;
}

export async function getListing(hotelId: string): Promise<Listing | null> {
  const supabase = createAdminSupabase();
  const { data: hotel } = await supabase.from('hotels').select('*').eq('id', hotelId).maybeSingle();
  if (!hotel) return null;

  const [websites, roomTypes, images, amenities, nearby, policies, legal] = await Promise.all([
    supabase
      .from('websites')
      .select('id, name, slug, status, published_at, created_at')
      .eq('hotel_id', hotelId)
      .order('created_at'),
    supabase
      .from('room_types')
      .select('id, name, base_price, is_active, sort_order, rooms (id), room_images (id)')
      .eq('hotel_id', hotelId)
      .order('sort_order'),
    supabase.from('hotel_images').select('id, url, alt_text, is_cover, sort_order').eq('hotel_id', hotelId).order('sort_order'),
    supabase.from('hotel_amenities').select('name, category, sort_order').eq('hotel_id', hotelId).order('sort_order'),
    supabase.from('hotel_nearby_places').select('place_type, name, distance_km, sort_order').eq('hotel_id', hotelId).order('sort_order'),
    supabase.from('hotel_policies').select('id').eq('hotel_id', hotelId),
    supabase.from('hotel_legal_details').select('*').eq('hotel_id', hotelId).maybeSingle(),
  ]);

  // A hotel can have more than one website; the listing looks after the first.
  const website = (websites.data ?? [])[0] ?? null;
  const roomRows = (roomTypes.data ?? []).map((rt: any) => ({
    id: rt.id,
    name: rt.name,
    base_price: Number(rt.base_price),
    is_active: Boolean(rt.is_active),
    rooms: rt.rooms?.length ?? 0,
    photos: rt.room_images?.length ?? 0,
  }));
  const legalRow = (legal.data ?? null) as Record<string, string | null> | null;
  const saved = (hotel.metadata?.listing?.policies ?? null) as Partial<PolicyAnswers> | null;

  const progress: Record<ListingStepKey, boolean> = {
    'basic-info': Boolean(hotel.name && hotel.email && hotel.phone && hotel.property_type),
    location: Boolean(hotel.address_line1 && hotel.city && hotel.state && hotel.postal_code),
    amenities: (amenities.data ?? []).length > 0,
    rooms: roomRows.some((r) => r.is_active && r.rooms > 0),
    photos: (images.data ?? []).length > 0,
    policies: (policies.data ?? []).length > 0,
    finance: Boolean(legalRow?.legal_name && legalRow?.pan && legalRow?.bank_account_number && legalRow?.bank_ifsc),
    'go-live': website?.status === 'ACTIVE',
  };

  return {
    hotel,
    website: website
      ? { id: website.id, name: website.name, slug: website.slug, status: website.status, published_at: website.published_at }
      : null,
    roomTypes: roomRows,
    images: (images.data ?? []) as Listing['images'],
    amenities: (amenities.data ?? []) as Listing['amenities'],
    nearby: (nearby.data ?? []).map((p: any) => ({
      place_type: p.place_type,
      name: p.name,
      distance_km: p.distance_km == null ? null : Number(p.distance_km),
    })),
    policyCount: (policies.data ?? []).length,
    policyAnswers: { ...DEFAULT_POLICY_ANSWERS, ...(saved ?? {}) },
    legal: legalRow,
    progress,
    missing: LISTING_STEPS.filter((s) => s.required && !progress[s.key]).map((s) => s.key),
    submittedAt: (hotel.metadata?.listing?.submitted_at as string | undefined) ?? null,
  };
}

function assertComplete(listing: Listing) {
  if (listing.missing.length) {
    const names = LISTING_STEPS.filter((s) => listing.missing.includes(s.key)).map((s) => s.label);
    throw new AppError(`Finish ${names.join(', ')} before the website goes live.`, 409);
  }
}

// ---------------------------------------------------------------------------
// Basic info — creates the hotel and its (draft) website the first time
// ---------------------------------------------------------------------------

/** The first of `base`, `base-2`, `base-3`… that no other row uses. */
async function freeSlug(table: 'hotels' | 'websites', base: string, ownId?: string): Promise<string> {
  const root = (slugify(base) || 'property').slice(0, 56).replace(/-+$/, '');
  const candidates = [root, ...Array.from({ length: 40 }, (_, i) => `${root}-${i + 2}`)];
  const { data } = await createAdminSupabase().from(table).select('id, slug').in('slug', candidates);
  const taken = new Set((data ?? []).filter((r) => r.id !== ownId).map((r) => r.slug));
  const free = candidates.find((c) => !taken.has(c));
  if (!free) throw new AppError('Too many properties share this name. Add the city to the name and try again.', 409);
  return free;
}

function basicColumns(data: BasicInfoInput) {
  return {
    name: data.name,
    property_type: data.property_type,
    star_rating: data.star_rating ?? null,
    tagline: data.tagline ?? null,
    description: data.description ?? null,
    email: data.email,
    phone: data.phone,
  };
}

function basicMeta(data: BasicInfoInput) {
  return {
    year_built: data.year_built ?? null,
    accepting_since: data.accepting_since ?? null,
    channel_manager: data.channel_manager === 'yes' ? data.channel_manager_name ?? null : null,
  };
}

/** Merge into hotels.metadata.listing without touching other metadata. */
async function writeListingMeta(hotelId: string, patch: Record<string, unknown>) {
  const supabase = createAdminSupabase();
  const { data } = await supabase.from('hotels').select('metadata').eq('id', hotelId).maybeSingle();
  const metadata = (data?.metadata ?? {}) as Record<string, any>;
  const { error } = await supabase
    .from('hotels')
    .update({ metadata: { ...metadata, listing: { ...(metadata.listing ?? {}), ...patch } } })
    .eq('id', hotelId);
  if (error) throw error;
}

async function createDraftWebsite(hotel: { id: string; name: string }, actorId: string) {
  const supabase = createAdminSupabase();
  const { data: template } = await supabase.from('website_templates').select('id').eq('key', 'classic').maybeSingle();
  const slug = await freeSlug('websites', hotel.name);

  const { data, error } = await supabase
    .from('websites')
    .insert({
      hotel_id: hotel.id,
      template_id: template?.id ?? null,
      name: hotel.name,
      slug,
      status: 'DRAFT',
      // Every website starts on the same blue; re-branding is a CRM edit.
      primary_color: '#0B4FD0',
      accent_color: '#15803D',
      created_by: actorId,
    })
    .select('id')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'website.created',
    entity: 'websites',
    entityId: data.id,
    hotelId: hotel.id,
    actorId,
    newValue: { name: hotel.name, slug, status: 'DRAFT' },
  });
}

/** Start a listing: a DRAFT hotel and a DRAFT website for it. Returns the hotel id. */
export async function createListing(data: BasicInfoInput, actorId: string): Promise<string> {
  const supabase = createAdminSupabase();
  const slug = await freeSlug('hotels', data.name);

  const { data: hotel, error } = await supabase
    .from('hotels')
    .insert({
      ...basicColumns(data),
      slug,
      status: 'DRAFT',
      metadata: { listing: basicMeta(data) },
      created_by: actorId,
    })
    .select('id, name')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'hotel.created',
    entity: 'hotels',
    entityId: hotel.id,
    hotelId: hotel.id,
    actorId,
    newValue: { ...basicColumns(data), slug, source: 'listing' },
  });

  await createDraftWebsite(hotel, actorId);
  return hotel.id;
}

export async function updateBasicInfo(hotelId: string, data: BasicInfoInput, actorId: string) {
  const supabase = createAdminSupabase();
  const { error } = await supabase.from('hotels').update(basicColumns(data)).eq('id', hotelId);
  if (error) throw error;
  await writeListingMeta(hotelId, basicMeta(data));

  // A website that is not live yet follows the hotel's name; one that is
  // live keeps its own (renaming it is a website edit).
  const { data: websites } = await supabase.from('websites').select('id, status').eq('hotel_id', hotelId);
  if (!websites?.length) {
    await createDraftWebsite({ id: hotelId, name: data.name }, actorId);
  } else {
    const drafts = websites.filter((w) => w.status === 'DRAFT').map((w) => w.id);
    if (drafts.length) await supabase.from('websites').update({ name: data.name }).in('id', drafts);
  }

  await recordAudit({
    action: 'hotel.updated',
    entity: 'hotels',
    entityId: hotelId,
    hotelId,
    actorId,
    newValue: basicColumns(data),
  });
}

// ---------------------------------------------------------------------------
// Location, amenities, policies
// ---------------------------------------------------------------------------

export async function saveLocation(hotelId: string, data: LocationInput, nearby: NearbyInput[], actorId: string) {
  const supabase = createAdminSupabase();
  const columns = {
    address_line1: data.address_line1,
    address_line2: data.address_line2 ?? null,
    city: data.city,
    state: data.state,
    postal_code: data.postal_code,
    country: data.country || 'India',
    google_maps_url: data.google_maps_url ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
  const { error } = await supabase.from('hotels').update(columns).eq('id', hotelId);
  if (error) throw error;

  // The form shows every nearby place, so what it sends is the whole list.
  const { error: clearError } = await supabase.from('hotel_nearby_places').delete().eq('hotel_id', hotelId);
  if (clearError) throw clearError;
  if (nearby.length) {
    const { error: placesError } = await supabase.from('hotel_nearby_places').insert(
      nearby.map((p, sort_order) => ({
        hotel_id: hotelId,
        place_type: p.place_type,
        name: p.name,
        distance_km: p.distance_km ?? null,
        sort_order,
      })),
    );
    if (placesError) throw placesError;
  }

  await recordAudit({
    action: 'hotel.location_updated',
    entity: 'hotels',
    entityId: hotelId,
    hotelId,
    actorId,
    newValue: { ...columns, nearby: nearby.length },
  });
}

export async function saveAmenities(hotelId: string, amenities: { name: string; category: string }[], actorId: string) {
  const supabase = createAdminSupabase();
  const { error } = await supabase.from('hotel_amenities').delete().eq('hotel_id', hotelId);
  if (error) throw error;
  if (amenities.length) {
    const { error: insertError } = await supabase
      .from('hotel_amenities')
      .insert(amenities.map((a, sort_order) => ({ hotel_id: hotelId, name: a.name, category: a.category, sort_order })));
    if (insertError) throw insertError;
  }

  await recordAudit({
    action: 'hotel.amenities_updated',
    entity: 'hotel_amenities',
    entityId: hotelId,
    hotelId,
    actorId,
    newValue: { amenities: amenities.map((a) => a.name) },
  });
}

/** Policy rows the listing writes; any other rows a hotel has are left alone. */
const LISTING_POLICY_TYPES = ['check_in', 'cancellation', 'couples', 'id', 'child', 'extra_bed', 'pet', 'smoking', 'other'];

export function policyRows(a: PolicyAnswers, checkIn: string, checkOut: string) {
  const cancellation =
    a.cancellation === 'non_refundable'
      ? 'Bookings are non-refundable once made. No-shows are charged the full stay.'
      : `Free cancellation up to ${a.cancellation.replace(/\D/g, '')} hours before check-in. Cancellations after that are charged one night, and no-shows the full stay.`;

  const smoking = {
    none: 'Smoking is not allowed anywhere on the property.',
    outdoor: 'All rooms and indoor areas are non-smoking. Smoking is allowed only in designated outdoor areas.',
    rooms: 'Smoking is allowed only in designated smoking rooms. All other rooms and indoor areas are non-smoking.',
  }[a.smoking];

  const rows: { policy_type: string; title: string; content: string }[] = [
    {
      policy_type: 'check_in',
      title: 'Check-in & check-out',
      content: `Check-in from ${formatTime(checkIn)}, check-out by ${formatTime(checkOut)}. Early check-in and late check-out are subject to availability and may be chargeable.`,
    },
    { policy_type: 'cancellation', title: 'Cancellation policy', content: cancellation },
    {
      policy_type: 'couples',
      title: 'Couples',
      content: a.couples ? 'Unmarried couples are welcome.' : 'Unmarried couples are not allowed.',
    },
    {
      policy_type: 'id',
      title: 'ID requirements',
      content: `A valid government-issued photo ID (Aadhaar, passport, driving licence or voter ID) is required at check-in for every adult guest. ${
        a.local_id ? 'IDs from the local city are accepted.' : 'IDs from the local city are not accepted.'
      }`,
    },
    {
      policy_type: 'child',
      title: 'Child policy',
      content:
        a.child_free_age > 0
          ? `Children under ${a.child_free_age} stay free when sharing the existing bedding. Older children are charged as extra guests.`
          : 'Every child is charged as an extra guest.',
    },
    {
      policy_type: 'extra_bed',
      title: 'Extra bed policy',
      content: a.extra_bed
        ? 'An extra bed or mattress can be added to the room for an additional nightly charge, subject to availability.'
        : 'Extra beds are not available.',
    },
    {
      policy_type: 'pet',
      title: 'Pet policy',
      content: a.pets ? 'Pets are welcome. Please let the property know before you arrive.' : 'Pets are not allowed.',
    },
    { policy_type: 'smoking', title: 'Smoking policy', content: smoking },
  ];
  if (a.other) rows.push({ policy_type: 'other', title: 'Other rules', content: a.other });
  return rows;
}

export async function savePolicies(hotelId: string, input: PoliciesInput, actorId: string) {
  const supabase = createAdminSupabase();
  const { check_in_time, check_out_time, ...rest } = input;
  const answers = rest as PolicyAnswers;

  const { error } = await supabase.from('hotels').update({ check_in_time, check_out_time }).eq('id', hotelId);
  if (error) throw error;
  await writeListingMeta(hotelId, { policies: answers });

  const { error: clearError } = await supabase
    .from('hotel_policies')
    .delete()
    .eq('hotel_id', hotelId)
    .in('policy_type', LISTING_POLICY_TYPES);
  if (clearError) throw clearError;

  const { error: insertError } = await supabase
    .from('hotel_policies')
    .insert(policyRows(answers, check_in_time, check_out_time).map((row, sort_order) => ({ hotel_id: hotelId, ...row, sort_order })));
  if (insertError) throw insertError;

  await recordAudit({
    action: 'hotel.policies_updated',
    entity: 'hotel_policies',
    entityId: hotelId,
    hotelId,
    actorId,
    newValue: { check_in_time, check_out_time, ...answers },
  });
}

// ---------------------------------------------------------------------------
// Finance & legal — staff-only table; the audit log never holds the numbers
// ---------------------------------------------------------------------------

const mask = (value: string | undefined | null) => (value ? `••••${value.slice(-4)}` : null);

export async function saveFinance(hotelId: string, data: FinanceInput, actorId: string) {
  const supabase = createAdminSupabase();
  const row = {
    hotel_id: hotelId,
    legal_name: data.legal_name,
    ownership_type: data.ownership_type,
    pan: data.pan,
    gstin: data.gstin ?? null,
    bank_account_name: data.bank_account_name,
    bank_account_number: data.bank_account_number,
    bank_ifsc: data.bank_ifsc,
    bank_name: data.bank_name ?? null,
    updated_by: actorId,
  };
  const { error } = await supabase.from('hotel_legal_details').upsert(row, { onConflict: 'hotel_id' });
  if (error) throw error;

  await recordAudit({
    action: 'hotel.legal_details_updated',
    entity: 'hotel_legal_details',
    entityId: hotelId,
    hotelId,
    actorId,
    newValue: {
      legal_name: data.legal_name,
      ownership_type: data.ownership_type,
      pan: mask(data.pan),
      gstin: mask(data.gstin),
      bank_account_number: mask(data.bank_account_number),
      bank_ifsc: data.bank_ifsc,
    },
  });
}

// ---------------------------------------------------------------------------
// Go live
// ---------------------------------------------------------------------------

/**
 * Publish the hotel and its website. Re-checks every required step on the
 * server: the page's checklist is only a convenience.
 */
export async function publishListing(hotelId: string, requestedSlug: string, actorId: string): Promise<{ slug: string }> {
  const listing = await getListing(hotelId);
  if (!listing) throw new AppError('This property no longer exists.', 404);
  assertComplete(listing);

  const supabase = createAdminSupabase();
  if (!listing.website) await createDraftWebsite(listing.hotel as { id: string; name: string }, actorId);
  const { data: website } = await supabase
    .from('websites')
    .select('id, slug, status')
    .eq('hotel_id', hotelId)
    .order('created_at')
    .limit(1)
    .single();
  if (!website) throw new AppError('The website could not be created. Please try again.', 500);

  // A live address never changes from here: links to it are already out.
  let slug = website.slug;
  if (website.status !== 'ACTIVE' && requestedSlug !== website.slug) {
    const { data: clash } = await supabase.from('websites').select('id').eq('slug', requestedSlug).neq('id', website.id).maybeSingle();
    if (clash) throw new AppError('That website address is already taken. Try another.', 409);
    slug = requestedSlug;
  }

  const { error } = await supabase
    .from('websites')
    .update({ slug, status: 'ACTIVE', published_at: new Date().toISOString() })
    .eq('id', website.id);
  if (error) throw error;

  const { error: hotelError } = await supabase.from('hotels').update({ status: 'ACTIVE', archived_at: null }).eq('id', hotelId);
  if (hotelError) throw hotelError;

  await writeListingMeta(hotelId, { approved_at: new Date().toISOString(), approved_by: actorId });
  await promoteOwners(hotelId);

  await recordAudit({
    action: 'website.published',
    entity: 'websites',
    entityId: website.id,
    hotelId,
    actorId,
    newValue: { slug, status: 'ACTIVE', source: 'listing' },
  });

  return { slug };
}

/**
 * An owner who listed from the website can only edit the listing. Once it is
 * live they run the property, so they move to Property Manager — still scoped
 * to this one hotel.
 */
async function promoteOwners(hotelId: string) {
  const supabase = createAdminSupabase();
  const { data: roles } = await supabase.from('roles').select('id, key').in('key', ['property_owner', 'property_manager']);
  const owner = roles?.find((r) => r.key === 'property_owner');
  const manager = roles?.find((r) => r.key === 'property_manager');
  if (!owner || !manager) return;

  const { data: owners } = await supabase.from('admin_users').select('id, hotel_scope').eq('role_id', owner.id);
  const theirs = (owners ?? []).filter((a) => {
    const scope = (a.hotel_scope ?? []) as string[];
    return scope.length === 1 && scope[0] === hotelId;
  });
  if (theirs.length) {
    const { error } = await supabase.from('admin_users').update({ role_id: manager.id }).in('id', theirs.map((a) => a.id));
    if (error) throw error;
  }
}

/** An owner sends a finished listing to AQOSS; it stays editable meanwhile. */
export async function submitListing(hotelId: string, actorId: string) {
  const listing = await getListing(hotelId);
  if (!listing) throw new AppError('This property no longer exists.', 404);
  assertComplete(listing);

  await writeListingMeta(hotelId, { submitted_at: new Date().toISOString(), submitted_by: actorId });
  await recordAudit({
    action: 'listing.submitted',
    entity: 'hotels',
    entityId: hotelId,
    hotelId,
    actorId,
    newValue: { name: listing.hotel.name },
  });
}

// ---------------------------------------------------------------------------
// Owners listing from the website
// ---------------------------------------------------------------------------

export interface OwnerSignup {
  property_type: string;
  property_name: string;
  full_name: string;
  email: string;
  mobile: string;
  password: string;
}

/**
 * An owner signs up on the website: their login, a draft hotel and website,
 * and a Property Owner admin account scoped to that hotel alone. The scope is
 * set in the same breath as the account — an admin with an empty scope sees
 * every hotel, so an owner must never exist without one.
 */
export async function registerOwner(input: OwnerSignup): Promise<{ hotelId: string }> {
  const supabase = createAdminSupabase();

  const { data: role } = await supabase.from('roles').select('id').eq('key', 'property_owner').maybeSingle();
  if (!role) throw new AppError('Listing from the website is not available yet. Please contact AQOSS.', 503);

  const { data: existing } = await supabase.from('profiles').select('id').ilike('email', input.email).maybeSingle();
  if (existing) throw new AppError('An account with this email already exists. Sign in instead.', 409);

  const { data: created, error } = await (supabase.auth as any).admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, mobile: input.mobile },
  });
  if (error || !created?.user) throw new AppError('The account could not be created. Please try again.', 400);
  const profileId = created.user.id as string;

  await supabase.from('profiles').update({ full_name: input.full_name, mobile: input.mobile, is_admin: true }).eq('id', profileId);

  const hotelId = await createListing(
    {
      property_type: input.property_type,
      name: input.property_name,
      email: input.email,
      phone: input.mobile,
      channel_manager: 'no',
    } as BasicInfoInput,
    profileId,
  );

  const { error: adminError } = await supabase.from('admin_users').insert({
    profile_id: profileId,
    role_id: role.id,
    hotel_scope: [hotelId],
    is_active: true,
    created_by: profileId,
  });
  if (adminError) throw adminError;

  await recordAudit({
    action: 'owner.registered',
    entity: 'hotels',
    entityId: hotelId,
    hotelId,
    actorId: profileId,
    newValue: { email: input.email, property: input.property_name, type: input.property_type },
  });

  return { hotelId };
}
