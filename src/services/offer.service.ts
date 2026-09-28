import 'server-only';

import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { couponFormSchema, offerFormSchema } from '@/lib/validation/schemas';
import { recordAudit } from '@/services/audit.service';

export type OfferInput = z.infer<typeof offerFormSchema>;
export type CouponInput = z.infer<typeof couponFormSchema>;

/**
 * Offers and coupons (PRD §30).
 *
 * An offer is a promotion shown on the hotel website; it does not change the
 * price on its own. A coupon is what checkout applies — `validate_coupon`
 * checks its dates, limits, hotels and minimum amount, so every field set here
 * is enforced there.
 */

/**
 * Coupons store instants; a date typed in the CRM means that whole day in
 * India, where every property is. Written as UTC ISO so comparisons against
 * `now()` hold whether they run in Postgres or on strings in demo mode.
 */
const IST = '+05:30';
const dayStart = (date: string) => new Date(`${date}T00:00:00${IST}`).toISOString();
const dayEnd = (date: string) => new Date(`${date}T23:59:59.999${IST}`).toISOString();

function discountColumns(input: { discount_kind: 'PERCENT' | 'AMOUNT'; discount_value: number }) {
  return input.discount_kind === 'PERCENT'
    ? { discount_percent: input.discount_value, discount_amount: null }
    : { discount_percent: null, discount_amount: input.discount_value };
}

export async function createOffer(input: OfferInput, actorId: string) {
  const { data, error } = await createAdminSupabase()
    .from('offers')
    .insert({
      hotel_id: input.hotel_id ?? null,
      title: input.title,
      description: input.description || null,
      offer_type: input.offer_type,
      ...discountColumns(input),
      // A cap only means something on a percentage.
      max_discount: input.discount_kind === 'PERCENT' ? input.max_discount ?? null : null,
      valid_from: input.valid_from || null,
      valid_until: input.valid_until || null,
      is_active: input.is_active,
    })
    .select('id')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'offer.created',
    entity: 'offers',
    entityId: data.id,
    hotelId: input.hotel_id ?? null,
    actorId,
    newValue: { title: input.title, hotel_id: input.hotel_id ?? null },
  });
  return data.id as string;
}

export async function createCoupon(input: CouponInput, actorId: string) {
  const supabase = createAdminSupabase();

  // Codes are unique regardless of case (citext); say so plainly.
  const { data: clash } = await supabase.from('coupons').select('id').ilike('code', input.code).maybeSingle();
  if (clash) throw new AppError(`The code ${input.code} is already in use. Choose another.`, 409);

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: input.code,
      description: input.description || null,
      offer_type: input.discount_kind === 'PERCENT' ? 'PERCENTAGE' : 'FIXED',
      ...discountColumns(input),
      max_discount: input.discount_kind === 'PERCENT' ? input.max_discount ?? null : null,
      min_booking_amount: input.min_booking_amount,
      hotel_ids: input.hotel_ids,
      usage_limit: input.usage_limit ?? null,
      usage_limit_per_user: input.usage_limit_per_user ?? null,
      valid_from: input.valid_from ? dayStart(input.valid_from) : null,
      valid_until: input.valid_until ? dayEnd(input.valid_until) : null,
      is_active: input.is_active,
      created_by: actorId,
    })
    .select('id')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'coupon.created',
    entity: 'coupons',
    entityId: data.id,
    hotelId: input.hotel_ids.length === 1 ? input.hotel_ids[0] : null,
    actorId,
    newValue: { code: input.code, hotel_ids: input.hotel_ids },
  });
  return data.id as string;
}

export async function setOfferActive(offerId: string, isActive: boolean, actorId: string) {
  const { data, error } = await createAdminSupabase()
    .from('offers')
    .update({ is_active: isActive })
    .eq('id', offerId)
    .select('hotel_id')
    .maybeSingle();
  if (error) throw error;
  await recordAudit({
    action: isActive ? 'offer.activated' : 'offer.paused',
    entity: 'offers',
    entityId: offerId,
    hotelId: data?.hotel_id ?? null,
    actorId,
  });
}

export async function setCouponActive(couponId: string, isActive: boolean, actorId: string) {
  const { error } = await createAdminSupabase().from('coupons').update({ is_active: isActive }).eq('id', couponId);
  if (error) throw error;
  await recordAudit({
    action: isActive ? 'coupon.activated' : 'coupon.paused',
    entity: 'coupons',
    entityId: couponId,
    actorId,
  });
}

/**
 * Delete a coupon that was never used. A used coupon is kept: deleting it
 * would cascade away its redemption history (who used it, on which booking),
 * so it can only be paused.
 */
export async function deleteCoupon(couponId: string, actorId: string) {
  const supabase = createAdminSupabase();

  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, code, used_count, hotel_ids')
    .eq('id', couponId)
    .maybeSingle();
  if (!coupon) throw new AppError('That coupon no longer exists.', 404);

  const { count } = await supabase
    .from('coupon_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', couponId);
  const uses = Math.max(Number(coupon.used_count) || 0, count ?? 0);
  if (uses > 0) {
    throw new AppError(
      `${coupon.code} has been used ${uses} time${uses === 1 ? '' : 's'}, so it is kept for the booking history. Pause it instead.`,
      409,
    );
  }

  const { error } = await supabase.from('coupons').delete().eq('id', couponId);
  if (error) throw error;

  await recordAudit({
    action: 'coupon.deleted',
    entity: 'coupons',
    entityId: couponId,
    hotelId: coupon.hotel_ids?.length === 1 ? coupon.hotel_ids[0] : null,
    actorId,
    oldValue: { code: coupon.code },
  });
  return coupon.code as string;
}

/**
 * Delete an offer. Offers are promotions only — no booking records point at
 * them — so any offer can go; a coupon linked to it just loses the link.
 */
export async function deleteOffer(offerId: string, actorId: string) {
  const supabase = createAdminSupabase();
  const { data: offer } = await supabase.from('offers').select('id, title, hotel_id').eq('id', offerId).maybeSingle();
  if (!offer) throw new AppError('That offer no longer exists.', 404);

  const { error } = await supabase.from('offers').delete().eq('id', offerId);
  if (error) throw error;

  await recordAudit({
    action: 'offer.deleted',
    entity: 'offers',
    entityId: offerId,
    hotelId: offer.hotel_id,
    actorId,
    oldValue: { title: offer.title },
  });
  return offer.title as string;
}
