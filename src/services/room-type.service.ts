import 'server-only';

import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { roomTypeSchema } from '@/lib/validation/schemas';
import { ensureInventory } from '@/services/availability.service';
import { recordAudit } from '@/services/audit.service';
import { AppError } from '@/lib/api';
import { slugify, todayISO } from '@/lib/utils';

export type RoomTypeInput = z.infer<typeof roomTypeSchema>;

/** How far ahead a room type is bookable. Matches a year of rate planning. */
const INVENTORY_DAYS = 365;

/** A room type as the edit form needs it. */
export interface RoomTypeRecord {
  id: string;
  hotel_id: string;
  name: string;
  slug: string;
  description: string | null;
  bed_type: string | null;
  room_size_sqft: number | null;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  base_price: number;
  discount_percent: number;
  is_refundable: boolean;
  is_active: boolean;
  physical_rooms: number;
  amenities: string;
}

export async function getRoomType(roomTypeId: string): Promise<RoomTypeRecord | null> {
  const { data } = await createAdminSupabase()
    .from('room_types')
    .select(
      'id, hotel_id, name, slug, description, bed_type, room_size_sqft, max_adults, max_children, max_occupancy, base_price, discount_percent, is_refundable, is_active, rooms (id), room_amenities (name, sort_order)',
    )
    .eq('id', roomTypeId)
    .maybeSingle();
  if (!data) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const row = data as any;
  return {
    ...row,
    base_price: Number(row.base_price),
    discount_percent: Number(row.discount_percent),
    physical_rooms: row.rooms?.length ?? 0,
    amenities: ((row.room_amenities ?? []) as any[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => a.name)
      .join(', '),
  };
}

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

  const { data: siblings } = await supabase.from('room_types').select('slug, sort_order').eq('hotel_id', hotelId);

  // Slugs are unique per hotel; "deluxe-room" becomes "deluxe-room-2".
  const taken = new Set((siblings ?? []).map((s) => s.slug));
  const baseSlug = slugify(data.name) || 'room';
  let slug = baseSlug;
  for (let n = 2; taken.has(slug); n++) slug = `${baseSlug}-${n}`;

  const sortOrder = (siblings ?? []).reduce((max, s) => Math.max(max, Number(s.sort_order) || 0), -1) + 1;

  const { data: roomType, error } = await supabase
    .from('room_types')
    .insert({ hotel_id: hotelId, slug, sort_order: sortOrder, ...detailColumns(data) })
    .select('id, slug')
    .single();
  if (error) throw error;

  await addPhysicalRooms(hotelId, roomType.id, data.physical_rooms);
  await writeAmenities(roomType.id, data.amenities);
  await openInventory(roomType.id, data.physical_rooms);

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

/**
 * Update a room type's details, amenities and room count.
 *
 * Fewer rooms removes the highest-numbered free ones; nights already sold keep
 * their allocation, because `ensure_room_inventory` never drops a night below
 * what is booked or blocked. The slug stays put so links keep working.
 */
export async function updateRoomType(input: { roomTypeId: string; data: RoomTypeInput; actorId: string }) {
  const supabase = createAdminSupabase();
  const before = await getRoomType(input.roomTypeId);
  if (!before) throw new AppError('That room type no longer exists.', 404);
  const { data } = input;

  const { error } = await supabase.from('room_types').update(detailColumns(data)).eq('id', before.id);
  if (error) throw error;

  const change = data.physical_rooms - before.physical_rooms;
  if (change > 0) await addPhysicalRooms(before.hotel_id, before.id, change);
  if (change < 0) await removePhysicalRooms(before.id, -change);
  if (change !== 0) await openInventory(before.id, data.physical_rooms);

  await writeAmenities(before.id, data.amenities, { replace: true });

  await recordAudit({
    action: 'room_type.updated',
    entity: 'room_types',
    entityId: before.id,
    hotelId: before.hotel_id,
    actorId: input.actorId,
    oldValue: { name: before.name, base_price: before.base_price, physical_rooms: before.physical_rooms, is_active: before.is_active },
    newValue: { name: data.name, base_price: data.base_price, physical_rooms: data.physical_rooms, is_active: data.is_active },
  });
}

// ---------------------------------------------------------------------------

function detailColumns(data: RoomTypeInput) {
  return {
    name: data.name,
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
  };
}

/** Rooms for a type go on one floor: the type's own, or the next free one. */
async function addPhysicalRooms(hotelId: string, roomTypeId: string, count: number) {
  const supabase = createAdminSupabase();
  const { data: existing } = await supabase.from('rooms').select('room_number, floor, room_type_id').eq('hotel_id', hotelId);
  const all = existing ?? [];

  const used = new Set(all.map((r) => String(r.room_number)));
  const ownFloor = all.find((r) => r.room_type_id === roomTypeId)?.floor;
  const floor = ownFloor
    ? Number.parseInt(ownFloor, 10) || 1
    : all.reduce((max, r) => Math.max(max, Number.parseInt(r.floor ?? '0', 10) || 0), 0) + 1;

  const rooms: { hotel_id: string; room_type_id: string; room_number: string; floor: string; status: string }[] = [];
  for (let unit = 1; rooms.length < count; unit++) {
    const number = `${floor}${String(unit).padStart(2, '0')}`;
    if (used.has(number)) continue;
    rooms.push({ hotel_id: hotelId, room_type_id: roomTypeId, room_number: number, floor: String(floor), status: 'AVAILABLE' });
  }
  const { error } = await supabase.from('rooms').insert(rooms);
  if (error) throw error;
}

async function removePhysicalRooms(roomTypeId: string, count: number) {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('rooms')
    .select('id, room_number, status')
    .eq('room_type_id', roomTypeId)
    .eq('status', 'AVAILABLE');

  const removable = (data ?? []).sort((a, b) =>
    String(b.room_number).localeCompare(String(a.room_number), undefined, { numeric: true }),
  );
  if (removable.length < count) {
    throw new AppError(
      `Only ${removable.length} room${removable.length === 1 ? ' is' : 's are'} free to remove; the rest are occupied, blocked or under maintenance.`,
      409,
    );
  }
  const { error } = await supabase
    .from('rooms')
    .delete()
    .in('id', removable.slice(0, count).map((r) => r.id));
  if (error) throw error;
}

async function writeAmenities(roomTypeId: string, text: string | null | undefined, options?: { replace?: boolean }) {
  const supabase = createAdminSupabase();
  const names = (text ?? '')
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .filter((a, i, all) => all.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i)
    .slice(0, 30);

  if (options?.replace) {
    const { error } = await supabase.from('room_amenities').delete().eq('room_type_id', roomTypeId);
    if (error) throw error;
  }
  if (names.length) {
    const { error } = await supabase
      .from('room_amenities')
      .insert(names.map((name, sort_order) => ({ room_type_id: roomTypeId, name, sort_order })));
    if (error) throw error;
  }
}

/** Sellable for the next year at `totalRooms` a night. */
async function openInventory(roomTypeId: string, totalRooms: number) {
  await ensureInventory({ roomTypeId, from: todayISO(), to: todayISO(INVENTORY_DAYS), totalRooms });
}
