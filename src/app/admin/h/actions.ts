'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission, canAccessHotel } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { roomTypeSchema } from '@/lib/validation/schemas';
import { hotelPanelPath } from '@/lib/admin/hotel-panel';
import { createRoomType } from '@/services/room-type.service';
import { LEAD_STATUSES, updateLead, type LeadStatus } from '@/services/lead.service';
import {
  deleteImage,
  hotelIdForOwner,
  moveImage,
  ownerOfImage,
  setCoverImage,
  uploadImage,
  type ImageKind,
} from '@/services/image.service';

export type PanelActionState = {
  error?: string;
  success?: string;
  /** Per-field messages from validation, keyed by input name. */
  fieldErrors?: Record<string, string>;
};

function toState(err: unknown): PanelActionState {
  if (err instanceof AppError) return { error: err.message };
  console.error('[aqoss] hotel panel action failed', err);
  return { error: 'That action could not be completed. Please try again.' };
}

/** Next.js signals redirects by throwing; let those through untouched. */
function isRedirectError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

/** Hotel panels, the website and the platform CRM all read what these change. */
function refresh() {
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function saveLead(
  _prev: PanelActionState,
  formData: FormData,
): Promise<PanelActionState> {
  try {
    const session = await requirePermission('leads.write');
    const bookingId = String(formData.get('booking_id') ?? '');
    const status = String(formData.get('status') ?? '') as LeadStatus;
    const notes = String(formData.get('notes') ?? '').trim().slice(0, 2000) || null;

    if (!LEAD_STATUSES.includes(status) || status === 'CONVERTED') {
      // CONVERTED is set by the booking being paid, never by hand.
      throw new AppError('Choose New, Contacted or Lost.', 400);
    }

    const { data: booking } = await createAdminSupabase()
      .from('bookings')
      .select('hotel_id')
      .eq('id', bookingId)
      .maybeSingle();
    if (!booking || !canAccessHotel(session, booking.hotel_id)) {
      throw new AppError('This lead is outside your assigned hotels.', 403);
    }

    await updateLead({ bookingId, status, notes, actorId: session.userId });
    refresh();
    return { success: 'Lead updated.' };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const WRITE_PERMISSION: Record<ImageKind, string> = {
  hotel: 'hotels.write',
  room: 'rooms.write',
};

function parseKind(value: unknown): ImageKind {
  if (value === 'hotel' || value === 'room') return value;
  throw new AppError('Unknown image type.', 400);
}

/** Permission + hotel scope for an image owner. Returns the owner's hotel. */
async function authoriseOwner(kind: ImageKind, ownerId: string) {
  const session = await requirePermission(WRITE_PERMISSION[kind]);
  const hotelId = await hotelIdForOwner(kind, ownerId);
  if (!hotelId || !canAccessHotel(session, hotelId)) {
    throw new AppError('This property is outside your assigned hotels.', 403);
  }
  return { session, hotelId };
}

/** One file per call, so the request stays under the server-action size limit. */
export async function uploadPanelImage(formData: FormData): Promise<PanelActionState> {
  try {
    const kind = parseKind(formData.get('kind'));
    const ownerId = String(formData.get('owner_id') ?? '');
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) throw new AppError('Choose an image to upload.', 400);

    const { session, hotelId } = await authoriseOwner(kind, ownerId);
    const altText = String(formData.get('alt_text') ?? '').trim().slice(0, 200) || null;

    await uploadImage({ kind, ownerId, hotelId, file, altText, actorId: session.userId });
    refresh();
    return { success: `${file.name} uploaded.` };
  } catch (err) {
    return toState(err);
  }
}

async function authoriseImage(kindValue: string, imageId: string) {
  const kind = parseKind(kindValue);
  const ownerId = await ownerOfImage(kind, imageId);
  if (!ownerId) throw new AppError('That image no longer exists.', 404);
  const { session, hotelId } = await authoriseOwner(kind, ownerId);
  return { kind, ownerId, session, hotelId };
}

export async function setPanelCoverImage(kind: string, imageId: string): Promise<PanelActionState> {
  try {
    const { kind: k, ownerId } = await authoriseImage(kind, imageId);
    await setCoverImage(k, ownerId, imageId);
    refresh();
    return { success: 'Cover photo updated.' };
  } catch (err) {
    return toState(err);
  }
}

export async function movePanelImage(kind: string, imageId: string, direction: -1 | 1): Promise<PanelActionState> {
  try {
    const { kind: k, ownerId } = await authoriseImage(kind, imageId);
    await moveImage(k, ownerId, imageId, direction === -1 ? -1 : 1);
    refresh();
    return {};
  } catch (err) {
    return toState(err);
  }
}

export async function deletePanelImage(kind: string, imageId: string): Promise<PanelActionState> {
  try {
    const { kind: k, ownerId, session, hotelId } = await authoriseImage(kind, imageId);
    await deleteImage({ kind: k, ownerId, imageId, hotelId, actorId: session.userId });
    refresh();
    return { success: 'Photo deleted.' };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

/** Create a room type in a hotel, then continue to its photos. */
export async function createPanelRoomType(
  _prev: PanelActionState,
  formData: FormData,
): Promise<PanelActionState> {
  try {
    const session = await requirePermission('rooms.write');
    const hotelId = String(formData.get('hotel_id') ?? '');

    const { data: hotel } = await createAdminSupabase()
      .from('hotels')
      .select('id, slug')
      .eq('id', hotelId)
      .maybeSingle();
    if (!hotel || !canAccessHotel(session, hotel.id)) {
      throw new AppError('This property is outside your assigned hotels.', 403);
    }

    const parsed = roomTypeSchema.safeParse({
      ...Object.fromEntries(
        [...formData.entries()].map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? undefined : v]),
      ),
      is_refundable: formData.get('is_refundable') === 'on',
      is_active: formData.get('is_active') === 'on',
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { error: 'Please fix the highlighted fields.', fieldErrors };
    }

    const roomType = await createRoomType({ hotelId: hotel.id, data: parsed.data, actorId: session.userId });
    refresh();
    redirect(`${hotelPanelPath(hotel.slug, `images/rooms/${roomType.id}`)}?created=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}
