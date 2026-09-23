import 'server-only';

import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { roomTypeSchema } from '@/lib/validation/schemas';
import { ensureInventory } from '@/services/availability.service';
import { recordAudit } from '@/services/audit.service';
import { slugify, todayISO } from '@/lib/utils';

export type RoomTypeInput = z.infer<typeof roomTypeSchema>;

/** How far ahead a new room type is bookable. Matches a year of rate planning. */
const INVENTORY_DAYS = 365;

/**
 * Create a room type with its physical rooms, and open it for sale.
 *
 * A room type is only sellable on nights that have an inventory row (PRD §9),
 * so creating one without inventory would put a room on the website that can
 * never be booked. Physical rooms are numbered on the next free floor, the
 * same `<floor><nn>` scheme the rest of the hotel uses.
 */
export async function createRoomType(input: {
  hotelId: string;
  data: RoomTypeInput;
  actorId: string;
}): Promise<{ id: string; slug: string }> {
  const supabase = createAdminSupabase();
  const { hotelId, data } = input;

  const [{ data: siblings }, { data: existingRooms }] = await Promise.all([
    supabase.from('room_types').select('slug, sort_order').eq('hotel_id', hotelId),
    supabase.from('rooms').select('room_number, floor').eq('hotel_id', hotelId),
  ]);

  // Slugs are unique per hotel; "deluxe-room" becomes "deluxe-room-2".
  const taken = new Set((siblings ?? []).map((s) => s.slug));
  const baseSlug = slugify(data.name) || 'room';
  let slug = baseSlug;
  for (let n = 2; taken.has(slug); n++) slug = `${baseSlug}-${n}`;

  const sortOrder = (siblings ?? []).reduce((max, s) => Math.max(max, Number(s.sort_order) || 0), -1) + 1;

  const { data: roomType, error } = await supabase
    .from('room_types')
    .insert({
      hotel_id: hotelId,
      name: data.name,
      slug,
      description: data.description || null,
      bed_type: data.bed_type || null,
      room_size_sqft: data.room_size_sqft ?? null,
      max_adults: data.max_adults,
      max_children: data.max_children,
      max_occupancy: data.max_occupancy,
      base_price: data.base_price,
      discount_percent: data.discount_percent,
      is_refundable: data.is_refundable,
      is_active: data.is_active,
      sort_order: sortOrder,
    })
    .select('id, slug')
    .single();
  if (error) throw error;

  // Physical rooms on the next floor up, skipping any number already in use.
  const usedNumbers = new Set((existingRooms ?? []).map((r) => String(r.room_number)));
  const floor =
    (existingRooms ?? []).reduce((max, r) => Math.max(max, Number.parseInt(r.floor ?? '0', 10) || 0), 0) + 1;
  const rooms: { hotel_id: string; room_type_id: string; room_number: string; floor: string; status: string }[] = [];
  for (let unit = 1; rooms.length < data.physical_rooms; unit++) {
    const number = `${floor}${String(unit).padStart(2, '0')}`;
    if (usedNumbers.has(number)) continue;
    rooms.push({ hotel_id: hotelId, room_type_id: roomType.id, room_number: number, floor: String(floor), status: 'AVAILABLE' });
  }
  const { error: roomsError } = await supabase.from('rooms').insert(rooms);
  if (roomsError) throw roomsError;

  const amenities = (data.amenities ?? '')
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .filter((a, i, all) => all.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i)
    .slice(0, 30);
  if (amenities.length) {
    const { error: amenitiesError } = await supabase
      .from('room_amenities')
      .insert(amenities.map((name, sort_order) => ({ room_type_id: roomType.id, name, sort_order })));
    if (amenitiesError) throw amenitiesError;
  }

  await ensureInventory({
    roomTypeId: roomType.id,
    from: todayISO(),
    to: todayISO(INVENTORY_DAYS),
    totalRooms: data.physical_rooms,
  });

  await recordAudit({
    action: 'room_type.created',
    entity: 'room_types',
    entityId: roomType.id,
    hotelId,
    actorId: input.actorId,
    newValue: { name: data.name, base_price: data.base_price, physical_rooms: data.physical_rooms },
  });

  return roomType as { id: string; slug: string };
}
