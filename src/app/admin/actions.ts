'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { requirePermission, can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { hotelSchema, websiteSchema, inventorySchema } from '@/lib/validation/schemas';
import { recordAudit } from '@/services/audit.service';
import { cancelBooking, setBookingStatus } from '@/services/booking.service';
import { refundPayment } from '@/services/payment.service';
import { moderateReview } from '@/services/review.service';
import { ensureInventory } from '@/services/availability.service';
import { formatCurrency, slugify, toISODate } from '@/lib/utils';
import { AppError, toApiError } from '@/lib/api';

export type AdminAuthState = { error?: string };
export type ActionState = { error?: string; success?: string };

/** Translate a thrown error into something the CRM can render. */
function toState(err: unknown): ActionState {
  if (err instanceof AppError) return { error: err.message };
  console.error('[aqoss] admin action failed', err);
  return { error: 'That action could not be completed. Please try again.' };
}

/**
 * Throw unless the row's hotel is inside the caller's scope. Looks the hotel up
 * rather than trusting the client, so a scoped admin cannot act on another
 * property by sending its id.
 */
async function assertRowInScope(session: AdminSession, table: string, id: string) {
  if (!session.hotelScope.length) return;
  const { data } = await createAdminSupabase()
    .from(table)
    .select('hotel_id')
    .eq('id', id)
    .maybeSingle();
  if (!data || !canAccessHotel(session, data.hotel_id)) {
    throw new AppError('This record is outside your assigned hotels.', 403);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function adminSignIn(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '/admin');

  if (!email || !password) return { error: 'Please enter your email and password.' };

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: 'That email and password do not match. Please try again.' };
  }

  // Being a valid user is not enough — CRM access needs an admin_users record.
  const { data: adminRow } = await createAdminSupabase()
    .from('admin_users')
    .select('id')
    .eq('profile_id', data.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!adminRow) {
    await supabase.auth.signOut();
    return { error: 'This account does not have CRM access.' };
  }

  revalidatePath('/admin', 'layout');
  redirect(redirectTo.startsWith('/admin') ? redirectTo : '/admin');
}

// ---------------------------------------------------------------------------
// Hotels (PRD §21)
// ---------------------------------------------------------------------------

export async function saveHotel(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requirePermission('hotels.write');
    const id = String(formData.get('id') ?? '') || null;

    const parsed = hotelSchema.parse({
      name: formData.get('name'),
      slug: formData.get('slug') || undefined,
      tagline: formData.get('tagline') || null,
      description: formData.get('description') || null,
      status: formData.get('status') ?? 'DRAFT',
      star_rating: formData.get('star_rating') || null,
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      address_line1: formData.get('address_line1') || null,
      city: formData.get('city') || null,
      state: formData.get('state') || null,
      country: formData.get('country') || 'India',
      postal_code: formData.get('postal_code') || null,
      latitude: formData.get('latitude') || null,
      longitude: formData.get('longitude') || null,
      check_in_time: formData.get('check_in_time') || '14:00',
      check_out_time: formData.get('check_out_time') || '11:00',
      tax_percent: formData.get('tax_percent') ?? 12,
      currency: formData.get('currency') || 'INR',
    });

    if (id && !canAccessHotel(session, id)) {
      return { error: 'This hotel is outside your assigned scope.' };
    }
    if (!id && session.hotelScope.length) {
      return { error: 'Only admins with access to every hotel can add a new one.' };
    }

    const supabase = createAdminSupabase();
    const payload: Record<string, unknown> = { ...parsed, slug: parsed.slug || slugify(parsed.name) };

    // AQOSS's commission: only an all-hotels admin who records payouts may set
    // it, so a property's own manager can never lower their commission.
    const commission = formData.get('commission_percent');
    if (commission !== null && commission !== '' && can(session, 'payouts.write') && !session.hotelScope.length) {
      const value = Number(commission);
      if (!(value >= 0 && value <= 100)) return { error: 'Commission must be between 0 and 100%.' };
      payload.commission_percent = value;
    }

    if (id) {
      const { data: before } = await supabase.from('hotels').select('*').eq('id', id).maybeSingle();
      const { error } = await supabase.from('hotels').update(payload).eq('id', id);
      if (error) throw error;

      await recordAudit({
        action: 'hotel.updated',
        entity: 'hotels',
        entityId: id,
        hotelId: id,
        actorId: session.userId,
        oldValue: before,
        newValue: payload,
      });
    } else {
      const { data, error } = await supabase
        .from('hotels')
        .insert({ ...payload, created_by: session.userId })
        .select('id')
        .single();
      if (error) throw error;

      await recordAudit({
        action: 'hotel.created',
        entity: 'hotels',
        entityId: data.id,
        hotelId: data.id,
        actorId: session.userId,
        newValue: payload,
      });

      revalidatePath('/admin/hotels');
      redirect(`/admin/hotels/${data.id}`);
    }

    revalidatePath('/', 'layout');
    return { success: 'Hotel saved.' };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}

export async function setHotelStatus(hotelId: string, status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') {
  const session = await requirePermission('hotels.write');
  if (!canAccessHotel(session, hotelId)) throw new AppError('Out of scope.', 403);

  const supabase = createAdminSupabase();
  await supabase
    .from('hotels')
    .update({ status, archived_at: status === 'ARCHIVED' ? new Date().toISOString() : null })
    .eq('id', hotelId);

  await recordAudit({
    action: `hotel.${status.toLowerCase()}`,
    entity: 'hotels',
    entityId: hotelId,
    hotelId,
    actorId: session.userId,
    newValue: { status },
  });

  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Websites (PRD §22, §23)
// ---------------------------------------------------------------------------

export async function saveWebsite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requirePermission('websites.write');
    const id = String(formData.get('id') ?? '') || null;

    const parsed = websiteSchema.parse({
      hotel_id: formData.get('hotel_id'),
      name: formData.get('name'),
      slug: formData.get('slug'),
      status: formData.get('status') ?? 'DRAFT',
      template_key: formData.get('template_key') || 'classic',
      primary_color: formData.get('primary_color') || '#0B4FD0',
      accent_color: formData.get('accent_color') || '#15803D',
      seo_title: formData.get('seo_title') || null,
      seo_description: formData.get('seo_description') || null,
      robots_indexable: formData.get('robots_indexable') === 'on',
      domains: String(formData.get('domains') ?? '')
        .split(/[\n,]/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
    });

    if (!canAccessHotel(session, parsed.hotel_id)) {
      return { error: 'This hotel is outside your assigned scope.' };
    }

    const supabase = createAdminSupabase();

    const { data: template } = await supabase
      .from('website_templates')
      .select('id')
      .eq('key', parsed.template_key)
      .maybeSingle();

    const payload = {
      hotel_id: parsed.hotel_id,
      template_id: template?.id ?? null,
      name: parsed.name,
      slug: parsed.slug,
      status: parsed.status,
      primary_color: parsed.primary_color,
      accent_color: parsed.accent_color,
      seo_title: parsed.seo_title,
      seo_description: parsed.seo_description,
      robots_indexable: parsed.robots_indexable,
      published_at: parsed.status === 'ACTIVE' ? new Date().toISOString() : null,
    };

    let websiteId = id;

    if (id) {
      const { error } = await supabase.from('websites').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('websites')
        .insert({ ...payload, created_by: session.userId })
        .select('id')
        .single();
      if (error) throw error;
      websiteId = data.id;
    }

    // Replace the domain list with whatever the form submitted.
    if (websiteId && parsed.domains) {
      await supabase.from('website_domains').delete().eq('website_id', websiteId);
      if (parsed.domains.length) {
        await supabase.from('website_domains').insert(
          parsed.domains.map((hostname, i) => ({
            website_id: websiteId,
            hostname,
            is_primary: i === 0,
            is_verified: false,
          })),
        );
      }
    }

    await recordAudit({
      action: id ? 'website.updated' : 'website.created',
      entity: 'websites',
      entityId: websiteId,
      hotelId: parsed.hotel_id,
      actorId: session.userId,
      newValue: payload,
    });

    revalidatePath('/', 'layout');
    if (!id && websiteId) redirect(`/admin/websites/${websiteId}`);

    return { success: 'Website saved.' };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}

export async function setWebsiteStatus(
  websiteId: string,
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
) {
  const session = await requirePermission('websites.write');
  await assertRowInScope(session, 'websites', websiteId);
  const supabase = createAdminSupabase();

  const { data } = await supabase
    .from('websites')
    .update({
      status,
      published_at: status === 'ACTIVE' ? new Date().toISOString() : null,
    })
    .eq('id', websiteId)
    .select('hotel_id')
    .maybeSingle();

  await recordAudit({
    action: status === 'ACTIVE' ? 'website.published' : 'website.unpublished',
    entity: 'websites',
    entityId: websiteId,
    hotelId: data?.hotel_id ?? null,
    actorId: session.userId,
    newValue: { status },
  });

  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Bookings (PRD §26)
// ---------------------------------------------------------------------------

/**
 * Result of a booking action. Returned rather than thrown: Next.js hides the
 * message of an error thrown from a server action in production builds, so
 * staff would otherwise see a generic failure instead of the reason.
 */
export type BookingActionResult = { error?: string; message?: string };

function actionError(err: unknown): BookingActionResult {
  return { error: toApiError(err).message };
}

export async function adminCancelBooking(bookingId: string, reason: string): Promise<BookingActionResult> {
  try {
    const session = await requirePermission('bookings.cancel');
    await assertRowInScope(session, 'bookings', bookingId);
    await cancelBooking({ bookingId, reason, actorId: session.userId });
    // Also refreshes the same booking inside any hotel panel.
    revalidatePath('/admin', 'layout');
    return { message: 'Booking cancelled.' };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminSetBookingStatus(
  bookingId: string,
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT',
): Promise<BookingActionResult> {
  try {
    const session = await requirePermission('bookings.checkin');
    await assertRowInScope(session, 'bookings', bookingId);
    await setBookingStatus({ bookingId, status, actorId: session.userId });
    revalidatePath('/admin', 'layout');
    return {};
  } catch (err) {
    return actionError(err);
  }
}

export async function adminRefund(bookingId: string, amount?: number, reason?: string): Promise<BookingActionResult> {
  try {
    const session = await requirePermission('payments.refund');
    await assertRowInScope(session, 'bookings', bookingId);
    const result = await refundPayment({ bookingId, amount, reason, actorId: session.userId });
    revalidatePath('/admin', 'layout');
    return {
      message:
        result.byHotel > 0
          ? `Refund of ${formatCurrency(result.amount)} recorded. ${formatCurrency(result.byHotel)} was paid at the hotel — hand it back to the guest (cash, UPI or card).`
          : `Refund of ${formatCurrency(result.amount)} sent back through the payment gateway.`,
    };
  } catch (err) {
    return actionError(err);
  }
}

// ---------------------------------------------------------------------------
// Reviews (PRD §19)
// ---------------------------------------------------------------------------

export async function adminModerateReview(
  reviewId: string,
  status: 'APPROVED' | 'HIDDEN' | 'DELETED' | 'PENDING',
  adminResponse?: string,
) {
  const session = await requirePermission('reviews.moderate');
  await assertRowInScope(session, 'reviews', reviewId);
  await moderateReview({ reviewId, status, adminResponse, actorId: session.userId });
  revalidatePath('/admin', 'layout');
}

// ---------------------------------------------------------------------------
// Inventory & pricing (PRD §9, §15)
// ---------------------------------------------------------------------------

export async function updateInventory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requirePermission('inventory.write');

    const parsed = inventorySchema.parse({
      room_type_id: formData.get('room_type_id'),
      from: formData.get('from'),
      to: formData.get('to'),
      total_rooms: formData.get('total_rooms') || undefined,
      price: formData.get('price') || undefined,
      single_price: formData.get('single_price') || undefined,
      extra_adult_price: formData.get('extra_adult_price') || undefined,
      extra_child_price: formData.get('extra_child_price') || undefined,
      // '' keeps each night as it is; editing a rate never reopens a closed night.
      is_closed: { open: false, close: true }[String(formData.get('sale') ?? '')],
    });

    if (parsed.to <= parsed.from) {
      return { error: 'The end date must be after the start date.' };
    }

    const supabase = createAdminSupabase();

    const { data: roomType } = await supabase
      .from('room_types')
      .select('hotel_id, base_price')
      .eq('id', parsed.room_type_id)
      .maybeSingle();

    if (!roomType) return { error: 'Room type not found.' };
    if (!canAccessHotel(session, roomType.hotel_id)) {
      return { error: 'This hotel is outside your assigned scope.' };
    }

    const dates: string[] = [];
    // Local date parts, not toISOString(): east of UTC, local midnight is
    // still the previous day in UTC and every price landed a night early.
    for (let d = new Date(`${parsed.from}T00:00:00`); d < new Date(`${parsed.to}T00:00:00`); d.setDate(d.getDate() + 1)) {
      dates.push(toISODate(d));
    }

    // Make sure a row exists for every night in the range first. With no room
    // count given, only the missing nights are added: ensure_room_inventory
    // resets every night it touches to the physical room count, which would
    // undo a hotel's own allocation just for editing a rate.
    if (parsed.total_rooms !== undefined) {
      await ensureInventory({
        roomTypeId: parsed.room_type_id,
        from: parsed.from,
        to: parsed.to,
        totalRooms: parsed.total_rooms,
      });
    } else {
      const { data: have } = await supabase
        .from('room_inventory')
        .select('stay_date')
        .eq('room_type_id', parsed.room_type_id)
        .gte('stay_date', parsed.from)
        .lt('stay_date', parsed.to);
      const present = new Set((have ?? []).map((r: { stay_date: string }) => r.stay_date));
      for (let i = 0; i < dates.length; i++) {
        if (present.has(dates[i])) continue;
        let j = i;
        while (j + 1 < dates.length && !present.has(dates[j + 1])) j++;
        const end = new Date(`${dates[j]}T00:00:00`);
        end.setDate(end.getDate() + 1);
        await ensureInventory({ roomTypeId: parsed.room_type_id, from: dates[i], to: toISODate(end) });
        i = j;
      }
    }

    if (parsed.is_closed !== undefined) {
      await supabase
        .from('room_inventory')
        .update({ is_closed: parsed.is_closed })
        .eq('room_type_id', parsed.room_type_id)
        .gte('stay_date', parsed.from)
        .lt('stay_date', parsed.to);
    }

    const rates = ['price', 'single_price', 'extra_adult_price', 'extra_child_price'] as const;
    if (rates.some((k) => parsed[k] !== undefined)) {
      // A blank field keeps that night's current rate, so read what is there.
      const { data: existing } = await supabase
        .from('room_prices')
        .select('stay_date, price, single_price, extra_adult_price, extra_child_price, discount_percent, min_nights')
        .eq('room_type_id', parsed.room_type_id)
        .gte('stay_date', parsed.from)
        .lt('stay_date', parsed.to);
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const byDate = new Map(((existing ?? []) as any[]).map((r) => [r.stay_date, r]));

      const { error } = await supabase.from('room_prices').upsert(
        dates.map((stay_date) => {
          const was = byDate.get(stay_date);
          return {
            hotel_id: roomType.hotel_id,
            room_type_id: parsed.room_type_id,
            stay_date,
            price: parsed.price ?? was?.price ?? roomType.base_price,
            single_price: parsed.single_price ?? was?.single_price ?? null,
            extra_adult_price: parsed.extra_adult_price ?? was?.extra_adult_price ?? null,
            extra_child_price: parsed.extra_child_price ?? was?.extra_child_price ?? null,
            discount_percent: was?.discount_percent ?? null,
            min_nights: was?.min_nights ?? 1,
          };
        }),
        { onConflict: 'room_type_id,stay_date' },
      );
      if (error) throw error;
    }

    await recordAudit({
      action: 'inventory.updated',
      entity: 'room_inventory',
      entityId: parsed.room_type_id,
      hotelId: roomType.hotel_id,
      actorId: session.userId,
      newValue: parsed,
    });

    revalidatePath('/admin', 'layout');
    return { success: 'Rates and inventory updated.' };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------

const settingSchema = z.object({ key: z.string().min(1), value: z.string() });

export async function updateSetting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requirePermission('settings.write');
    const parsed = settingSchema.parse({ key: formData.get('key'), value: formData.get('value') });

    let value: unknown;
    try {
      value = JSON.parse(parsed.value);
    } catch {
      value = parsed.value; // plain strings are stored as JSON strings
    }

    await createAdminSupabase()
      .from('platform_settings')
      .upsert({ key: parsed.key, value, updated_by: session.userId }, { onConflict: 'key' });

    revalidatePath('/admin/settings');
    return { success: 'Setting saved.' };
  } catch (err) {
    return toState(err);
  }
}

/** Next.js signals redirects by throwing; let those through untouched. */
function isRedirectError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}
