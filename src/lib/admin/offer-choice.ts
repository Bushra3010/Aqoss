import 'server-only';

import type { AdminSession } from '@/lib/auth/session';
import { listPanelHotels } from '@/lib/admin/hotel-panel';
import type { HotelChoice } from '@/components/admin/OfferForms';

/**
 * Which hotels an offer or coupon form may target: one locked hotel inside a
 * hotel panel, otherwise the admin's hotels — plus "every hotel" only for
 * admins not limited to some properties.
 */
export async function offerHotelChoice(
  session: AdminSession,
  locked?: { id: string; name: string },
): Promise<HotelChoice> {
  if (locked) return { locked, hotels: [locked], allowAll: false };
  const hotels = await listPanelHotels(session);
  return { hotels: hotels.map(({ id, name }) => ({ id, name })), allowAll: session.hotelScope.length === 0 };
}
