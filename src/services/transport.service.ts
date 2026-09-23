import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import type { TransportSlot } from '@/types';

/** Transport options a guest can add to a stay (PRD §16). */
export async function getTransportOptions(input: {
  hotelId: string;
  fromDate: string;
  toDate: string;
}): Promise<TransportSlot[]> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from('transport_slots')
    .select(
      `id, route_id, depart_date, depart_time, seat_capacity, booked_seats, price_override,
       transport_routes!inner (id, name, pickup_location, drop_location, distance_km,
                               duration_minutes, base_price, price_per_seat, is_active),
       transport_services (vehicle_type)`,
    )
    .eq('hotel_id', input.hotelId)
    .eq('status', 'ACTIVE')
    .gte('depart_date', input.fromDate)
    .lte('depart_date', input.toDate)
    .order('depart_date')
    .order('depart_time');

  if (error) throw error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? [])
    .map((slot: any) => {
      const route = Array.isArray(slot.transport_routes)
        ? slot.transport_routes[0]
        : slot.transport_routes;
      const service = Array.isArray(slot.transport_services)
        ? slot.transport_services[0]
        : slot.transport_services;

      return {
        id: slot.id,
        route_id: slot.route_id,
        route: {
          id: route.id,
          name: route.name,
          pickup_location: route.pickup_location,
          drop_location: route.drop_location,
          distance_km: route.distance_km,
          duration_minutes: route.duration_minutes,
          base_price: Number(route.base_price),
          price_per_seat: Number(route.price_per_seat),
        },
        depart_date: slot.depart_date,
        depart_time: slot.depart_time,
        seat_capacity: slot.seat_capacity,
        booked_seats: slot.booked_seats,
        available_seats: slot.seat_capacity - slot.booked_seats,
        price:
          slot.price_override != null
            ? Number(slot.price_override)
            : Number(route.base_price) + Number(route.price_per_seat),
        vehicle_type: service?.vehicle_type ?? null,
        is_active: route.is_active,
      } as TransportSlot & { is_active: boolean };
    })
    .filter((s) => s.is_active && s.available_seats > 0);
}
