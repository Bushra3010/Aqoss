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
