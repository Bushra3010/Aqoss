'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermission, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { couponFormSchema, offerFormSchema } from '@/lib/validation/schemas';
import { createCoupon, createOffer, setCouponActive, setOfferActive } from '@/services/offer.service';

export type OfferActionState = { error?: string; fieldErrors?: Record<string, string> };

function toState(err: unknown): OfferActionState {
  if (err instanceof AppError) return { error: err.message };
  console.error('[aqoss] offer action failed', err);
  return { error: 'That action could not be completed. Please try again.' };
}

/** Next.js signals redirects by throwing; let those through untouched. */
function isRedirectError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

/** Only ever send the admin back inside the CRM. */
function safeReturn(value: FormDataEntryValue | null): string {
  const path = String(value ?? '');
  return path.startsWith('/admin/') && !path.startsWith('//') ? path : '/admin/offers';
}

/** Form strings to schema input: blank fields become "not set". */
function formFields(formData: FormData) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'hotel_ids' || key.startsWith('$')) continue;
    out[key] = typeof value === 'string' && value.trim() === '' ? undefined : value;
  }
  out.is_active = formData.get('is_active') === 'on';
  return out;
}

function fieldErrorsOf(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: 'Please fix the highlighted fields.', fieldErrors };
}

/**
 * A hotel-scoped admin works only on their own properties: an offer must name
 * one of them, and a coupon must be limited to them — never platform-wide.
 */
function assertHotelsInScope(session: AdminSession, hotelIds: string[]) {
  if (!session.hotelScope.length) return;
  if (!hotelIds.length || !hotelIds.every((id) => canAccessHotel(session, id))) {
    throw new AppError('Choose one of your own hotels.', 403);
  }
}

export async function saveOffer(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  try {
    const session = await requirePermission('offers.write');
    const parsed = offerFormSchema.safeParse(formFields(formData));
    if (!parsed.success) return fieldErrorsOf(parsed.error.issues);

    assertHotelsInScope(session, parsed.data.hotel_id ? [parsed.data.hotel_id] : []);
    await createOffer(parsed.data, session.userId);

    revalidatePath('/', 'layout');
    redirect(safeReturn(formData.get('return_to')));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}

export async function saveCoupon(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  try {
    const session = await requirePermission('offers.write');
    const hotelIds = formData.getAll('hotel_ids').map(String).filter(Boolean);
    // An empty list means "every hotel", so an empty *selection* must not become one.
    if (formData.get('scope') === 'some' && !hotelIds.length) {
      return { error: 'Please fix the highlighted fields.', fieldErrors: { hotel_ids: 'Pick at least one hotel.' } };
    }
    const parsed = couponFormSchema.safeParse({ ...formFields(formData), hotel_ids: hotelIds });
    if (!parsed.success) return fieldErrorsOf(parsed.error.issues);

    assertHotelsInScope(session, parsed.data.hotel_ids);
    await createCoupon(parsed.data, session.userId);

    revalidatePath('/', 'layout');
    redirect(safeReturn(formData.get('return_to')));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}

export async function toggleOffer(offerId: string, isActive: boolean): Promise<OfferActionState> {
  try {
    const session = await requirePermission('offers.write');
    const { data: offer } = await createAdminSupabase()
      .from('offers')
      .select('hotel_id')
      .eq('id', offerId)
      .maybeSingle();
    if (!offer) throw new AppError('That offer no longer exists.', 404);
    assertHotelsInScope(session, offer.hotel_id ? [offer.hotel_id] : []);

    await setOfferActive(offerId, isActive, session.userId);
    revalidatePath('/', 'layout');
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function toggleCoupon(couponId: string, isActive: boolean): Promise<OfferActionState> {
  try {
    const session = await requirePermission('offers.write');
    const { data: coupon } = await createAdminSupabase()
      .from('coupons')
      .select('hotel_ids')
      .eq('id', couponId)
      .maybeSingle();
    if (!coupon) throw new AppError('That coupon no longer exists.', 404);
    assertHotelsInScope(session, (coupon.hotel_ids ?? []) as string[]);

    await setCouponActive(couponId, isActive, session.userId);
    revalidatePath('/', 'layout');
    return {};
  } catch (err) {
    return toState(err);
  }
}
