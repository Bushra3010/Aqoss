import 'server-only';

import { cache } from 'react';
import { getAdminSession, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';

/** URL prefix of one hotel's own panel. */
export const HOTEL_PANEL_PREFIX = '/admin/h';

export function hotelPanelPath(hotelSlug: string, sub = ''): string {
  return `${HOTEL_PANEL_PREFIX}/${hotelSlug}${sub ? `/${sub.replace(/^\//, '')}` : ''}`;
}

export interface HotelPanelHotel {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  status: string;
  currency: string;
  website: { id: string; slug: string; status: string } | null;
}

export interface HotelPanel {
  session: AdminSession;
  hotel: HotelPanelHotel;
}

/**
 * Resolve the hotel a panel URL points at, for the signed-in admin.
 *
 * Returns null when the slug is unknown *or* the admin's hotel scope does not
 * include it — callers render the same "not found" either way, so a scoped
 * manager cannot probe which other hotels exist.
 */
export const getHotelPanel = cache(async (hotelSlug: string): Promise<HotelPanel | null> => {
  const session = await getAdminSession();
  if (!session) return null;

  const { data } = await createAdminSupabase()
    .from('hotels')
    .select('id, name, slug, city, state, status, currency, websites (id, slug, status)')
    .eq('slug', hotelSlug)
    .maybeSingle();

  if (!data || !canAccessHotel(session, data.id)) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const websites = ((data as any).websites ?? []) as HotelPanelHotel['website'][];
  const website = websites.find((w) => w?.status === 'ACTIVE') ?? websites[0] ?? null;

  return {
    session,
    hotel: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      city: data.city,
      state: data.state,
      status: data.status,
      currency: data.currency ?? 'INR',
      website,
    },
  };
});

/** Hotels the admin may open a panel for, for the switcher. */
export async function listPanelHotels(session: AdminSession) {
  let query = createAdminSupabase().from('hotels').select('id, name, slug, city').order('name');
  if (session.hotelScope.length) query = query.in('id', session.hotelScope);
  const { data } = await query;
  return (data ?? []) as { id: string; name: string; slug: string; city: string | null }[];
}
