import 'server-only';

import type { AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { BookableRoomType } from '@/components/admin/BookingForms';

/** Active room types staff may book: one hotel's, or every hotel in scope. */
export async function bookableRoomTypes(session: AdminSession, hotelId?: string): Promise<BookableRoomType[]> {
  let query = createAdminSupabase()
    .from('room_types')
    .select('id, hotel_id, name, max_adults, max_children, max_occupancy, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (hotelId) query = query.eq('hotel_id', hotelId);
  else if (session.hotelScope.length) query = query.in('hotel_id', session.hotelScope);

  const { data } = await query;
  return ((data ?? []) as (BookableRoomType & { sort_order: number })[]).map(
    ({ id, hotel_id, name, max_adults, max_children, max_occupancy }) => ({
      id, hotel_id, name, max_adults, max_children, max_occupancy,
    }),
  );
}
