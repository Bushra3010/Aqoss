'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermission, can, canAccessHotel } from '@/lib/auth/session';
import { AppError } from '@/lib/api';
import { KNOWN_AMENITIES, listingPath, nextStep, type ListingStepKey } from '@/lib/listing';
import {
  basicInfoSchema,
  fieldErrorsOf,
  financeSchema,
  locationSchema,
  nearbyPlaceSchema,
  policiesSchema,
  websiteSlugSchema,
} from '@/lib/validation/listing';
import {
  createListing,
  publishListing,
  saveAmenities,
  saveFinance,
  saveLocation,
  savePolicies,
  submitListing,
  updateBasicInfo,
  type NearbyInput,
} from '@/services/listing.service';

/**
 * Each step returns its errors, or redirects to the next step. Errors are
 * returned rather than thrown: Next hides a thrown server-action message in
 * production builds.
 */
export type ListingActionState = { error?: string; fieldErrors?: Record<string, string> };

function toState(err: unknown): ListingActionState {
  if (err instanceof AppError) return { error: err.message };
  console.error('[aqoss] listing action failed', err);
  return { error: 'That could not be saved. Please try again.' };
}

const INVALID = 'Please fix the highlighted fields.';

/**
 * Filling in a listing needs `hotels.write` on that hotel — its own admins,
 * including an owner who signed up on the website. Starting a new one in the
 * CRM needs an all-hotels admin who also manages websites. Putting it live is
 * `listings.publish` (see `publishListingStep`).
 */
async function authorise(hotelId: string | null) {
  const session = await requirePermission('hotels.write');
  if (hotelId && !canAccessHotel(session, hotelId)) {
    throw new AppError('This property is outside your assigned hotels.', 403);
  }
  if (!hotelId && (session.hotelScope.length || !can(session, 'websites.write'))) {
    throw new AppError('Only admins with access to every hotel can list a new property.', 403);
  }
  return session;
}

function hotelIdOf(formData: FormData): string {
  const id = String(formData.get('hotel_id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError('This listing could not be found.', 404);
  return id;
}

function fields(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

/** After a save: everything that shows the hotel is stale; go to the next step. */
function moveOn(hotelId: string, step: ListingStepKey): never {
  revalidatePath('/', 'layout');
  redirect(listingPath(hotelId, nextStep(step)));
}

// ---------------------------------------------------------------------------

export async function saveBasicInfoStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  const existing = String(formData.get('hotel_id') ?? '') || null;
  let hotelId: string;
  try {
    const session = await authorise(existing ? hotelIdOf(formData) : null);
    const parsed = basicInfoSchema.safeParse(fields(formData));
    if (!parsed.success) return { error: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };

    if (existing) {
      hotelId = existing;
      await updateBasicInfo(hotelId, parsed.data, session.userId);
    } else {
      hotelId = await createListing(parsed.data, session.userId);
    }
  } catch (err) {
    return toState(err);
  }
  moveOn(hotelId, 'basic-info');
}

export async function saveLocationStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  let hotelId: string;
  try {
    hotelId = hotelIdOf(formData);
    const session = await authorise(hotelId);
    const parsed = locationSchema.safeParse(fields(formData));
    const fieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error);

    // Nearby places arrive as parallel lists; a row without a name is empty.
    const types = formData.getAll('nearby_type').map(String);
    const names = formData.getAll('nearby_name').map(String);
    const distances = formData.getAll('nearby_distance').map(String);
    const nearby: NearbyInput[] = [];
    names.forEach((name, i) => {
      if (!name.trim()) return;
      const place = nearbyPlaceSchema.safeParse({ place_type: types[i], name, distance_km: distances[i] });
      if (place.success) nearby.push(place.data);
      else fieldErrors[`nearby.${i}`] = place.error.issues[0]?.message ?? 'Check this place.';
    });

    if (!parsed.success || Object.keys(fieldErrors).length) return { error: INVALID, fieldErrors };
    await saveLocation(hotelId, parsed.data, nearby.slice(0, 12), session.userId);
  } catch (err) {
    return toState(err);
  }
  moveOn(hotelId, 'location');
}

export async function saveAmenitiesStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  let hotelId: string;
  try {
    hotelId = hotelIdOf(formData);
    const session = await authorise(hotelId);

    const picked = new Set(formData.getAll('amenity').map(String));
    const known = KNOWN_AMENITIES.filter((a) => picked.has(a.name));
    const others = String(formData.get('other_amenities') ?? '')
      .split(/[,\n]/)
      .map((a) => a.trim())
      .filter(Boolean);
    if (others.some((a) => a.length > 60)) {
      return { error: INVALID, fieldErrors: { other_amenities: 'Keep each amenity under 60 characters.' } };
    }

    const all = [...known, ...others.map((name) => ({ name, category: 'other' }))].filter(
      (a, i, list) => list.findIndex((b) => b.name.toLowerCase() === a.name.toLowerCase()) === i,
    );
    if (!all.length) return { error: 'Choose at least one amenity the property offers.' };
    if (all.length > 60) return { error: 'Choose at most 60 amenities.' };

    await saveAmenities(hotelId, all, session.userId);
  } catch (err) {
    return toState(err);
  }
  moveOn(hotelId, 'amenities');
}

export async function savePoliciesStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  let hotelId: string;
  try {
    hotelId = hotelIdOf(formData);
    const session = await authorise(hotelId);
    const parsed = policiesSchema.safeParse(fields(formData));
    if (!parsed.success) return { error: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
    await savePolicies(hotelId, parsed.data, session.userId);
  } catch (err) {
    return toState(err);
  }
  moveOn(hotelId, 'policies');
}

export async function saveFinanceStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  let hotelId: string;
  try {
    hotelId = hotelIdOf(formData);
    const session = await authorise(hotelId);
    const parsed = financeSchema.safeParse(fields(formData));
    if (!parsed.success) return { error: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
    await saveFinance(hotelId, parsed.data, session.userId);
  } catch (err) {
    return toState(err);
  }
  moveOn(hotelId, 'finance');
}

/** An owner sends the finished listing to AQOSS for approval. */
export async function submitListingStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  let hotelId: string;
  try {
    hotelId = hotelIdOf(formData);
    const session = await authorise(hotelId);
    await submitListing(hotelId, session.userId);
  } catch (err) {
    return toState(err);
  }
  revalidatePath('/', 'layout');
  redirect(`${listingPath(hotelId, 'go-live')}&submitted=1`);
}

/** AQOSS's approval: the hotel and its website go live. */
export async function publishListingStep(_prev: ListingActionState, formData: FormData): Promise<ListingActionState> {
  let hotelId: string;
  try {
    hotelId = hotelIdOf(formData);
    const session = await authorise(hotelId);
    if (!can(session, 'listings.publish')) {
      throw new AppError('AQOSS reviews every listing before it goes live. Submit it for approval instead.', 403);
    }
    const slug = websiteSlugSchema.safeParse(formData.get('slug'));
    if (!slug.success) return { error: INVALID, fieldErrors: { slug: slug.error.issues[0]?.message ?? 'Check the address.' } };
    await publishListing(hotelId, slug.data, session.userId);
  } catch (err) {
    return toState(err);
  }
  revalidatePath('/', 'layout');
  redirect(`${listingPath(hotelId, 'go-live')}&published=1`);
}
