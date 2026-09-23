import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { recordAudit } from '@/services/audit.service';
import type { ReviewStatus } from '@/types';

/**
 * Reviews (PRD §19). Only a customer whose stay is CHECKED_OUT may review it,
 * and only once — enforced by a trigger and a unique index in the database as
 * well as the check here.
 */
export async function submitReview(input: {
  bookingId: string;
  customerId: string;
  rating: number;
  title?: string;
  comment?: string;
  subRatings?: {
    cleanliness?: number;
    service?: number;
    location?: number;
    value?: number;
  };
  images?: string[];
}) {
  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, hotel_id, customer_id, guest_name, status')
    .eq('id', input.bookingId)
    .maybeSingle();

  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.customer_id !== input.customerId) {
    throw new AppError('You can only review your own stays.', 403);
  }
  if (booking.status !== 'CHECKED_OUT') {
    throw new AppError('You can review a stay once it is complete.', 409);
  }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', input.bookingId)
    .maybeSingle();

  if (existing) throw new AppError('You have already reviewed this stay.', 409);

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'reviews.auto_approve')
    .maybeSingle();

  const autoApprove = settings?.value === true;

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      hotel_id: booking.hotel_id,
      booking_id: booking.id,
      customer_id: input.customerId,
      author_name: booking.guest_name,
      rating: input.rating,
      title: input.title ?? null,
      comment: input.comment ?? null,
      cleanliness_rating: input.subRatings?.cleanliness ?? null,
      service_rating: input.subRatings?.service ?? null,
      location_rating: input.subRatings?.location ?? null,
      value_rating: input.subRatings?.value ?? null,
      status: autoApprove ? 'APPROVED' : 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;

  if (input.images?.length) {
    await supabase.from('review_images').insert(
      input.images.map((url, i) => ({ review_id: review.id, url, sort_order: i })),
    );
  }

  return review;
}

/** Admin moderation (PRD §19). */
export async function moderateReview(input: {
  reviewId: string;
  status: ReviewStatus;
  adminResponse?: string;
  actorId?: string | null;
}) {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from('reviews')
    .update({
      status: input.status,
      admin_response: input.adminResponse ?? undefined,
      responded_at: input.adminResponse ? new Date().toISOString() : undefined,
      moderated_by: input.actorId ?? null,
    })
    .eq('id', input.reviewId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AppError('Review not found.', 404);

  await recordAudit({
    action: 'review.moderated',
    entity: 'reviews',
    entityId: data.id,
    hotelId: data.hotel_id,
    actorId: input.actorId ?? null,
    newValue: { status: input.status },
  });

  return data;
}

/** Stays this customer may still review (drives the dashboard prompt). */
export async function getReviewableBookings(customerId: string) {
  const supabase = createAdminSupabase();

  const { data } = await supabase
    .from('bookings')
    .select('id, reference, check_out, hotels!inner (name), reviews (id)')
    .eq('customer_id', customerId)
    .eq('status', 'CHECKED_OUT')
    .order('check_out', { ascending: false });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).filter((b: any) => !b.reviews?.length);
}
