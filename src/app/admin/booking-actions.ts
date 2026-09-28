'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission, can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError, toApiError } from '@/lib/api';
import {
  paymentMethodSchema,
  staffBookingSchema,
  staffGuestSchema,
  staffStaySchema,
} from '@/lib/validation/schemas';
import { quoteBooking } from '@/services/pricing.service';
import {
  createStaffBooking,
  modifyBooking,
  quoteModification,
  updateBookingGuest,
} from '@/services/booking.service';
import { recordManualPayment } from '@/services/payment.service';
import type { PriceBreakdown } from '@/types';

export type BookingFormState = { error?: string; success?: string; fieldErrors?: Record<string, string> };

/** Next.js signals redirects by throwing; let those through untouched. */
function isRedirectError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

/** Database and service errors to something staff can act on. */
function toState(err: unknown): BookingFormState {
  return { error: toApiError(err).message };
}

function fieldErrorsOf(error: z.ZodError): BookingFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    const top = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    if (top && !fieldErrors[top]) fieldErrors[top] = issue.message;
  }
  return { error: 'Please fix the highlighted fields.', fieldErrors };
}

/** Only ever continue somewhere inside the CRM. */
function safeAdminPath(value: FormDataEntryValue | null, fallback: string): string {
  const path = String(value ?? '');
  return path.startsWith('/admin/') && !path.startsWith('//') ? path : fallback;
}

/** Form fields → schema input; blank means "not set". */
function fields(formData: FormData) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$')) continue;
    out[key] = typeof value === 'string' && value.trim() === '' ? undefined : value;
  }
  try {
    out.rooms = JSON.parse(String(formData.get('rooms') ?? '[]'));
  } catch {
    out.rooms = [];
  }
  return out;
}

function assertHotel(session: AdminSession, hotelId: string) {
  if (!canAccessHotel(session, hotelId)) throw new AppError('This hotel is outside your assigned hotels.', 403);
}

async function bookingInScope(session: AdminSession, bookingId: string) {
  const { data } = await createAdminSupabase()
    .from('bookings')
    .select('id, hotel_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!data) throw new AppError('Booking not found.', 404);
  assertHotel(session, data.hotel_id);
  return data;
}

// ---------------------------------------------------------------------------
// Live price for the forms
// ---------------------------------------------------------------------------

export type QuotePreview =
  | { ok: true; breakdown: PriceBreakdown; couponDropped?: string | null; amountPaid?: number }
  | { ok: false; error: string };

/**
 * The price a staff booking — or a change to one — will be saved at. Same
 * services the save uses, so the preview and the result never disagree.
 */
export async function previewStaffQuote(input: {
  hotelId?: string;
  bookingId?: string;
  checkIn: string;
  checkOut: string;
  rooms: unknown;
  couponCode?: string | null;
}): Promise<QuotePreview> {
  try {
    const session = await requirePermission('bookings.write');
    const stay = staffStaySchema.safeParse({ check_in: input.checkIn, check_out: input.checkOut, rooms: input.rooms });
    if (!stay.success) return { ok: false, error: stay.error.issues[0]?.message ?? 'Check the stay details.' };

    if (input.bookingId) {
      await bookingInScope(session, input.bookingId);
      const { breakdown, couponDropped, current } = await quoteModification({
        bookingId: input.bookingId,
        checkIn: stay.data.check_in,
        checkOut: stay.data.check_out,
        rooms: stay.data.rooms,
      });
      return { ok: true, breakdown, couponDropped, amountPaid: Number(current.amount_paid) - Number(current.amount_refunded ?? 0) };
    }

    if (!input.hotelId) return { ok: false, error: 'Choose a hotel.' };
    assertHotel(session, input.hotelId);
    const { breakdown } = await quoteBooking({
      hotelId: input.hotelId,
      checkIn: stay.data.check_in,
      checkOut: stay.data.check_out,
      rooms: stay.data.rooms,
      couponCode: input.couponCode || null,
    });
    return { ok: true, breakdown };
  } catch (err) {
    return { ok: false, error: toApiError(err).message };
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createStaffBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  try {
    const session = await requirePermission('bookings.write');
    const raw = fields(formData);

    const meta = staffBookingSchema.safeParse(raw);
    const stay = staffStaySchema.safeParse(raw);
    const guest = staffGuestSchema.safeParse(raw);
    if (!meta.success) return fieldErrorsOf(meta.error);
    if (!stay.success) return fieldErrorsOf(stay.error);
    if (!guest.success) return fieldErrorsOf(guest.error);

    assertHotel(session, meta.data.hotel_id);
    const takePayment = (meta.data.payment_amount ?? 0) > 0;
    if (takePayment && !can(session, 'payments.write')) {
      throw new AppError('Your role cannot record payments. Save the booking without one.', 403);
    }
    if (takePayment && !meta.data.payment_method) {
      return { error: 'Please fix the highlighted fields.', fieldErrors: { payment_method: 'Choose how they paid.' } };
    }

    const { booking } = await createStaffBooking({
      hotelId: meta.data.hotel_id,
      checkIn: stay.data.check_in,
      checkOut: stay.data.check_out,
      rooms: stay.data.rooms,
      guest: {
        name: guest.data.guest_name,
        email: guest.data.guest_email,
        phone: guest.data.guest_phone,
        address: guest.data.guest_address ?? undefined,
        special_requests: guest.data.special_requests ?? undefined,
        adults: stay.data.rooms.reduce((s, r) => s + r.adults, 0),
        children: stay.data.rooms.reduce((s, r) => s + r.children, 0),
      },
      couponCode: meta.data.coupon_code,
      source: meta.data.source,
      actorId: session.userId,
    });

    let paymentNote = '';
    if (takePayment) {
      try {
        await recordManualPayment({
          bookingId: booking.id,
          amount: Math.min(meta.data.payment_amount!, Number(booking.total_amount)),
          method: meta.data.payment_method!,
          reference: meta.data.payment_reference,
          actorId: session.userId,
        });
      } catch (err) {
        // The booking stands; say the payment needs recording again.
        console.error('[aqoss] payment after staff booking failed', err);
        paymentNote = '&payment=failed';
      }
    }

    revalidatePath('/admin', 'layout');
    const base = safeAdminPath(formData.get('return_base'), '/admin/bookings');
    redirect(`${base}/${booking.id}?created=1${paymentNote}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

export async function updateBookingGuestAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  try {
    const session = await requirePermission('bookings.write');
    const booking = await bookingInScope(session, String(formData.get('booking_id') ?? ''));
    const guest = staffGuestSchema.safeParse(fields(formData));
    if (!guest.success) return fieldErrorsOf(guest.error);

    await updateBookingGuest({
      bookingId: booking.id,
      guest: {
        name: guest.data.guest_name,
        email: guest.data.guest_email,
        phone: guest.data.guest_phone,
        address: guest.data.guest_address,
        special_requests: guest.data.special_requests,
      },
      actorId: session.userId,
    });
    revalidatePath('/admin', 'layout');
    return { success: 'Guest details saved.' };
  } catch (err) {
    return toState(err);
  }
}

export async function modifyBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  try {
    const session = await requirePermission('bookings.write');
    const current = await bookingInScope(session, String(formData.get('booking_id') ?? ''));
    const stay = staffStaySchema.safeParse(fields(formData));
    if (!stay.success) return fieldErrorsOf(stay.error);

    const { couponDropped } = await modifyBooking({
      bookingId: current.id,
      checkIn: stay.data.check_in,
      checkOut: stay.data.check_out,
      rooms: stay.data.rooms,
      actorId: session.userId,
    });

    revalidatePath('/admin', 'layout');
    const base = safeAdminPath(formData.get('return_base'), '/admin/bookings');
    redirect(`${base}/${current.id}?changed=1${couponDropped ? `&coupon_dropped=${encodeURIComponent(couponDropped)}` : ''}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Payments taken by staff
// ---------------------------------------------------------------------------

export async function recordPaymentAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  try {
    const session = await requirePermission('payments.write');
    const booking = await bookingInScope(session, String(formData.get('booking_id') ?? ''));

    const parsed = z
      .object({
        amount: z.coerce.number({ invalid_type_error: 'Enter an amount.' }).positive('Enter an amount.'),
        method: paymentMethodSchema,
        reference: z.string().trim().max(100).nullish(),
      })
      .safeParse(fields(formData));
    if (!parsed.success) return fieldErrorsOf(parsed.error);

    const { paymentId } = await recordManualPayment({
      bookingId: booking.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference,
      actorId: session.userId,
    });
    revalidatePath('/admin', 'layout');

    // From the Payments section: continue to the payment just recorded.
    const base = formData.get('return_base');
    if (base) redirect(`${safeAdminPath(base, '/admin/payments')}/${paymentId}?recorded=1`);
    return { success: 'Payment recorded.' };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return toState(err);
  }
}
