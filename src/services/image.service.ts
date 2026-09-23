import 'server-only';

import { randomUUID } from 'node:crypto';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { recordAudit } from '@/services/audit.service';

/**
 * Hotel and room photos (PRD §6, §7).
 *
 * Both kinds share one shape — an owner, a url, a cover flag and an order — so
 * one set of functions serves both, keyed by `ImageKind`. Files go to the
 * public buckets created in the storage migration; the database row is what
 * the website reads.
 */
export type ImageKind = 'hotel' | 'room';

const KINDS = {
  hotel: { table: 'hotel_images', owner: 'hotel_id', bucket: 'hotel-images' },
  room: { table: 'room_images', owner: 'room_type_id', bucket: 'room-images' },
} as const;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export interface ManagedImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_cover: boolean;
  sort_order: number;
}

export async function listImages(kind: ImageKind, ownerId: string): Promise<ManagedImage[]> {
  const { table, owner } = KINDS[kind];
  const { data } = await createAdminSupabase()
    .from(table)
    .select('id, url, alt_text, is_cover, sort_order')
    .eq(owner, ownerId)
    .order('sort_order');
  return (data ?? []) as ManagedImage[];
}

/** The hotel an image owner belongs to — what access is checked against. */
export async function hotelIdForOwner(kind: ImageKind, ownerId: string): Promise<string | null> {
  if (kind === 'hotel') return ownerId;
  const { data } = await createAdminSupabase()
    .from('room_types')
    .select('hotel_id')
    .eq('id', ownerId)
    .maybeSingle();
  return data?.hotel_id ?? null;
}

/** The owner of an existing image row, or null if it does not exist. */
export async function ownerOfImage(kind: ImageKind, imageId: string): Promise<string | null> {
  const { table, owner } = KINDS[kind];
  const { data } = await createAdminSupabase().from(table).select(owner).eq('id', imageId).maybeSingle();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data as any)?.[owner] ?? null;
}

export async function uploadImage(input: {
  kind: ImageKind;
  ownerId: string;
  hotelId: string;
  file: File;
  altText: string | null;
  actorId: string;
}): Promise<ManagedImage> {
  const { table, owner, bucket } = KINDS[input.kind];
  const { file } = input;

  if (!IMAGE_TYPES.includes(file.type)) {
    throw new AppError('Upload a JPEG, PNG, WebP or AVIF image.', 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AppError('Images must be 10 MB or smaller.', 400);
  }

  const supabase = createAdminSupabase();
  // Grouped by hotel, then by room type for room photos.
  const folder = input.kind === 'hotel' ? input.hotelId : `${input.hotelId}/${input.ownerId}`;
  const path = `${folder}/${randomUUID()}.${EXTENSIONS[file.type]}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error('[aqoss] image upload failed', uploadError);
    throw new AppError('The image could not be uploaded. Please try again.', 502);
  }

  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const existing = await listImages(input.kind, input.ownerId);

  const { data, error } = await supabase
    .from(table)
    .insert({
      [owner]: input.ownerId,
      url,
      alt_text: input.altText,
      // New photos join the end; the first one ever is the cover.
      is_cover: existing.length === 0,
      sort_order: existing.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1,
    })
    .select('id, url, alt_text, is_cover, sort_order')
    .single();
  if (error) throw error;

  await recordAudit({
    action: 'image.uploaded',
    entity: table,
    entityId: data.id,
    hotelId: input.hotelId,
    actorId: input.actorId,
    newValue: { url },
  });

  return data as ManagedImage;
}

/**
 * The cover is always the first photo: the website gallery leads with the
 * first image, while search cards and link previews read `is_cover`. Keeping
 * them the same photo means there is one answer to "what does this hotel
 * look like". Writes the order and the flag together.
 */
async function writeOrder(kind: ImageKind, images: ManagedImage[]) {
  const { table } = KINDS[kind];
  const supabase = createAdminSupabase();
  await Promise.all(
    images.map((image, order) =>
      image.sort_order === order && image.is_cover === (order === 0)
        ? null
        : supabase.from(table).update({ sort_order: order, is_cover: order === 0 }).eq('id', image.id),
    ),
  );
}

/** Make a photo the cover by moving it to the front. */
export async function setCoverImage(kind: ImageKind, ownerId: string, imageId: string) {
  const images = await listImages(kind, ownerId);
  const index = images.findIndex((i) => i.id === imageId);
  if (index < 0) return;
  const [cover] = images.splice(index, 1);
  await writeOrder(kind, [cover, ...images]);
}

/** Swap a photo with its neighbour. Moving into first place makes it the cover. */
export async function moveImage(kind: ImageKind, ownerId: string, imageId: string, direction: -1 | 1) {
  const images = await listImages(kind, ownerId);
  const index = images.findIndex((i) => i.id === imageId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= images.length) return;

  [images[index], images[target]] = [images[target], images[index]];
  await writeOrder(kind, images);
}

export async function deleteImage(input: {
  kind: ImageKind;
  ownerId: string;
  imageId: string;
  hotelId: string;
  actorId: string;
}) {
  const { table, owner, bucket } = KINDS[input.kind];
  const supabase = createAdminSupabase();

  const { data: image } = await supabase
    .from(table)
    .select('id, url, is_cover')
    .eq('id', input.imageId)
    .eq(owner, input.ownerId)
    .maybeSingle();
  if (!image) return;

  const { error } = await supabase.from(table).delete().eq('id', image.id);
  if (error) throw error;

  // Only files this app uploaded live in the bucket; seeded photos are remote.
  const path = storagePath(bucket, image.url);
  if (path) await supabase.storage.from(bucket).remove([path]);

  // Close the gap; whichever photo is now first becomes the cover.
  await writeOrder(input.kind, await listImages(input.kind, input.ownerId));

  await recordAudit({
    action: 'image.deleted',
    entity: table,
    entityId: image.id,
    hotelId: input.hotelId,
    actorId: input.actorId,
    oldValue: { url: image.url },
  });
}

/** `<bucket>/<path>` at the end of a Supabase public URL or a demo file URL. */
function storagePath(bucket: string, url: string): string | null {
  const marker = `/${bucket}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  if (!url.includes('/storage/v1/object/public/') && !url.includes('/api/demo-files/')) return null;
  return url.slice(at + marker.length);
}
