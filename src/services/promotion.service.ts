import 'server-only';

import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { promotionFormSchema } from '@/lib/validation/schemas';
import { recordAudit } from '@/services/audit.service';

export type PromotionInput = z.infer<typeof promotionFormSchema>;

/**
 * Promotions (migration 17): Basic, Last Minute, Long Stay and Early Bird.
 * Unlike offers they change the price — `quote_room_stay` applies the best one
 * eligible for each night — so the rule fields saved here are the ones it
 * reads. Coupon promotions are coupons (`offer.service.ts`).
 */

export const PROMOTION_KINDS = {
  BASIC: { label: 'Basic promotion', blurb: 'A straight discount, optionally for set stay or booking dates.' },
  LAST_MINUTE: { label: 'Last minute promotion', blurb: 'For guests who book close to check-in.' },
  LONG_STAY: { label: 'Long stay promotion', blurb: 'For stays of at least a set number of nights.' },
  EARLY_BIRD: { label: 'Early bird promotion', blurb: 'For guests who book well ahead of check-in.' },
} as const;

export async function createPromotion(input: PromotionInput, actorId: string) {
  // Room types must belong to the promotion's hotel.
  if (input.room_type_ids.length) {
    const { data } = await createAdminSupabase()
      .from('room_types')
      .select('id')
      .eq('hotel_id', input.hotel_id)
      .in('id', input.room_type_ids);
    if ((data ?? []).length !== input.room_type_ids.length) {
      throw new AppError('Choose rooms of this hotel.', 422);
    }
  }

  const { data, error } = await createAdminSupabase()
    .from('promotions')
    .insert({
      hotel_id: input.hotel_id,
      kind: input.kind,
      title: input.title,
      discount_percent: input.discount_percent,
      room_type_ids: input.room_type_ids,
      stay_from: input.stay_from || null,
      stay_until: input.stay_until || null,
      book_from: input.book_from || null,
      book_until: input.book_until || null,
      // Only the kind's own rule is kept, so a stray field cannot narrow it.
      min_nights: input.kind === 'LONG_STAY' ? input.min_nights : null,
      max_days_before: input.kind === 'LAST_MINUTE' ? input.max_days_before : null,
      min_days_before: input.kind === 'EARLY_BIRD' ? input.min_days_before : null,
      is_active: input.is_active,
      created_by: actorId,
    })
    .select('id')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'promotion.created',
    entity: 'promotions',
    entityId: data.id,
    hotelId: input.hotel_id,
    actorId,
    newValue: input,
  });
  return data.id as string;
}

export async function setPromotionActive(promotionId: string, isActive: boolean, actorId: string) {
  const { data, error } = await createAdminSupabase()
    .from('promotions')
    .update({ is_active: isActive })
    .eq('id', promotionId)
    .select('id, hotel_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('That promotion no longer exists.', 404);

  await recordAudit({
    action: isActive ? 'promotion.activated' : 'promotion.paused',
    entity: 'promotions',
    entityId: promotionId,
    hotelId: data.hotel_id,
    actorId,
  });
}

/**
 * Bookings keep their price breakdown, not a link to the promotion, so a
 * promotion can always be deleted without touching past bookings.
 */
export async function deletePromotion(promotionId: string, actorId: string) {
  const supabase = createAdminSupabase();
  const { data: before } = await supabase.from('promotions').select('*').eq('id', promotionId).maybeSingle();
  if (!before) throw new AppError('That promotion no longer exists.', 404);

  const { error } = await supabase.from('promotions').delete().eq('id', promotionId);
  if (error) throw error;

  await recordAudit({
    action: 'promotion.deleted',
    entity: 'promotions',
    entityId: promotionId,
    hotelId: before.hotel_id,
    actorId,
    oldValue: before,
  });
}
