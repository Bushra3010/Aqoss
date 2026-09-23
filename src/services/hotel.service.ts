import 'server-only';

import { cache } from 'react';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { HotelSiteData, Review } from '@/types';

/**
 * Loads everything a hotel website template renders (PRD §6, §17, §18, §19).
 *
 * One call per page render, cached for the request. The service-role client is
 * used deliberately: this data is public anyway, and it lets us fetch the whole
 * site payload in a single round trip without fighting RLS joins.
 */
export const getHotelSiteData = cache(
  async (websiteId: string): Promise<HotelSiteData | null> => {
    const supabase = createAdminSupabase();

    const { data: website, error } = await supabase
      .from('websites')
      .select(
        `id, hotel_id, name, slug, status, logo_url, favicon_url, primary_color,
         accent_color, seo_title, seo_description, og_image_url, robots_indexable, content,
         hotels!inner (
           id, name, slug, tagline, description, logo_url, star_rating, status,
           email, phone, address_line1, address_line2, city, state, country, postal_code,
           latitude, longitude, google_maps_url, check_in_time, check_out_time,
           currency, tax_percent, highlights
         )`,
      )
      .eq('id', websiteId)
      .maybeSingle();

    if (error || !website) return null;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const hotel = (Array.isArray((website as any).hotels)
      ? (website as any).hotels[0]
      : (website as any).hotels) as HotelSiteData['hotel'];

    if (!hotel) return null;

    const [images, amenities, policies, nearby, roomTypes, reviews, offers] = await Promise.all([
      supabase
        .from('hotel_images')
        .select('id, url, alt_text, caption, is_cover, sort_order')
        .eq('hotel_id', hotel.id)
        .order('sort_order'),
      supabase
        .from('hotel_amenities')
        .select('id, name, icon, category, sort_order')
        .eq('hotel_id', hotel.id)
        .order('sort_order'),
      supabase
        .from('hotel_policies')
        .select('id, policy_type, title, content, sort_order')
        .eq('hotel_id', hotel.id)
        .order('sort_order'),
      supabase
        .from('hotel_nearby_places')
        .select('id, name, place_type, distance_km, travel_time')
        .eq('hotel_id', hotel.id)
        .order('sort_order'),
      supabase
        .from('room_types')
        .select(
          `id, name, slug, description, bed_type, room_size_sqft, max_adults, max_children,
           max_occupancy, base_price, discount_percent, cancellation_policy, sort_order,
           room_images (url, alt_text, is_cover, sort_order),
           room_amenities (name, icon, sort_order)`,
        )
        .eq('hotel_id', hotel.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('reviews')
        .select('id, author_name, rating, title, comment, status, admin_response, created_at')
        .eq('hotel_id', hotel.id)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('offers')
        .select('id, title, description, offer_type, discount_percent, discount_amount, valid_from, valid_until')
        .or(`hotel_id.eq.${hotel.id},hotel_id.is.null`)
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    const reviewRows = (reviews.data ?? []) as Review[];
    const average =
      reviewRows.length > 0
        ? Math.round((reviewRows.reduce((s, r) => s + Number(r.rating), 0) / reviewRows.length) * 10) / 10
        : 0;

    return {
      website: website as unknown as HotelSiteData['website'],
      hotel,
      images: (images.data ?? []) as HotelSiteData['images'],
      amenities: (amenities.data ?? []) as HotelSiteData['amenities'],
      policies: (policies.data ?? []) as HotelSiteData['policies'],
      nearby: (nearby.data ?? []) as HotelSiteData['nearby'],
      roomTypes: (roomTypes.data ?? []).map((rt: any) => ({
        ...rt,
        images: (rt.room_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        amenities: (rt.room_amenities ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })) as HotelSiteData['roomTypes'],
      reviews: reviewRows,
      reviewSummary: { average, count: reviewRows.length },
      offers: (offers.data ?? []) as HotelSiteData['offers'],
    };
  },
);

/** A single room type with its gallery, for the room detail page (PRD §45). */
export const getRoomType = cache(async (hotelId: string, slug: string) => {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('room_types')
    .select(
      `id, name, slug, description, bed_type, room_size_sqft, max_adults, max_children,
       max_occupancy, base_price, discount_percent, cancellation_policy, is_refundable,
       extra_bed_allowed, extra_bed_price,
       room_images (url, alt_text, is_cover, sort_order),
       room_amenities (name, icon, sort_order)`,
    )
    .eq('hotel_id', hotelId)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  return data;
});
