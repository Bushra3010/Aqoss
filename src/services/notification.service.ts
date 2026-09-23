import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { getTransport, renderTemplate } from '@/lib/notifications';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { env } from '@/lib/env';
import type { NotificationChannel } from '@/types';

/**
 * Notifications are queued, not sent inline (PRD §20, §28).
 *
 * Booking creation writes rows into `notifications` and returns immediately, so
 * a slow email provider can never fail a paid booking. `dispatchQueued()` drains
 * the queue — call it from a cron route, a worker, or right after enqueuing in
 * development.
 */

/** Build the merge values a booking template expects (PRD §29). */
async function bookingTemplateValues(bookingId: string) {
  const supabase = createAdminSupabase();

  const { data } = await supabase
    .from('bookings')
    .select(
      `*,
       hotels!inner (name, phone, email, address_line1, city, state, postal_code,
                     check_in_time, check_out_time, currency),
       booking_rooms (room_type_name, rooms),
       websites (slug)`,
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (!data) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const b = data as any;
  const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
  const currency = hotel?.currency ?? 'INR';

  const roomSummary = (b.booking_rooms ?? [])
    .map((r: any) => `${r.rooms} × ${r.room_type_name}`)
    .join(', ');

  const address = [hotel?.address_line1, hotel?.city, hotel?.state, hotel?.postal_code]
    .filter(Boolean)
    .join(', ');

  return {
    booking: b,
    hotel,
    values: {
      customer_name: b.guest_name,
      hotel_name: hotel?.name ?? '',
      hotel_address: address,
      hotel_phone: hotel?.phone ?? '',
      booking_reference: b.reference,
      room_summary: roomSummary,
      check_in: formatDate(b.check_in),
      check_out: formatDate(b.check_out),
      check_in_time: hotel?.check_in_time ? formatTime(hotel.check_in_time) : '',
      check_out_time: hotel?.check_out_time ? formatTime(hotel.check_out_time) : '',
      guests: `${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}`,
      nights: b.nights,
      room_subtotal: formatCurrency(Number(b.room_subtotal), currency),
      tax_total: formatCurrency(Number(b.tax_total), currency),
      discount_total: formatCurrency(Number(b.discount_total), currency),
      total_amount: formatCurrency(Number(b.total_amount), currency),
      amount_paid: formatCurrency(Number(b.amount_paid), currency),
      refund_amount: formatCurrency(Number(b.amount_refunded), currency),
      payment_status: b.payment_status,
      cancellation_policy: b.price_breakdown?.cancellation_policy ?? 'As per property policy',
      transaction_id: b.price_breakdown?.transaction_id ?? '',
      review_url: `${env.appUrl}/dashboard/bookings/${b.id}/review`,
    } as Record<string, unknown>,
  };
}

/**
 * Queue every channel configured for an event.
 * Missing templates are skipped silently — a hotel may not use WhatsApp.
 */
export async function queueBookingNotifications(
  bookingId: string,
  eventKey: string,
  options: { scheduledAt?: Date } = {},
): Promise<number> {
  const supabase = createAdminSupabase();
  const context = await bookingTemplateValues(bookingId);
  if (!context) return 0;

  const { booking, values } = context;

  // Hotel-specific templates override the platform defaults.
  const { data: templates } = await supabase
    .from('notification_templates')
    .select('id, hotel_id, event_key, channel, subject, body')
    .eq('event_key', eventKey)
    .eq('is_active', true)
    .or(`hotel_id.eq.${booking.hotel_id},hotel_id.is.null`);

  if (!templates?.length) return 0;

  const byChannel = new Map<string, (typeof templates)[number]>();
  for (const t of templates) {
    const existing = byChannel.get(t.channel);
    if (!existing || (t.hotel_id && !existing.hotel_id)) byChannel.set(t.channel, t);
  }

  const rows = [...byChannel.values()]
    .map((template) => {
      const channel = template.channel as NotificationChannel;
      const recipient =
        channel === 'EMAIL' ? booking.guest_email : booking.guest_phone;
      if (!recipient) return null;

      return {
        hotel_id: booking.hotel_id,
        booking_id: booking.id,
        customer_id: booking.customer_id,
        event_key: eventKey,
        channel,
        recipient,
        subject: template.subject ? renderTemplate(template.subject, values) : null,
        body: renderTemplate(template.body, values),
        payload: values,
        scheduled_at: (options.scheduledAt ?? new Date()).toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return 0;

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;

  return rows.length;
}

/** Queue the pre-arrival reminder for a confirmed booking (PRD §20). */
export async function scheduleCheckInReminder(bookingId: string, hoursBefore = 24) {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('bookings')
    .select('check_in')
    .eq('id', bookingId)
    .maybeSingle();

  if (!data) return 0;

  const when = new Date(`${data.check_in}T09:00:00`);
  when.setHours(when.getHours() - hoursBefore);

  return queueBookingNotifications(bookingId, 'booking.reminder', { scheduledAt: when });
}

/**
 * Drain the outbox. Safe to run repeatedly; each row is marked before sending
 * so a crash mid-batch cannot produce duplicate messages on the next run.
 */
export async function dispatchQueued(limit = 50): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminSupabase();

  const { data: pending } = await supabase
    .from('notifications')
    .select('id, channel, recipient, subject, body, attempts')
    .eq('state', 'QUEUED')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit);

  if (!pending?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    // Claim the row with a compare-and-swap on `attempts`: if another worker
    // got here first the attempt count has already moved on, the update matches
    // nothing, and we skip the row instead of sending it twice.
    const { data: claimed } = await supabase
      .from('notifications')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)
      .eq('state', 'QUEUED')
      .eq('attempts', row.attempts)
      .select('id')
      .maybeSingle();

    if (!claimed) continue;

    const transport = getTransport(row.channel as NotificationChannel);

    let result;
    try {
      result = await transport.send({
        to: row.recipient,
        subject: row.subject,
        body: row.body ?? '',
      });
    } catch (err) {
      result = { delivered: false, error: (err as Error).message };
    }

    const state = result.delivered ? 'SENT' : row.attempts + 1 >= 3 ? 'FAILED' : 'QUEUED';

    await supabase
      .from('notifications')
      .update({
        state,
        sent_at: result.delivered ? new Date().toISOString() : null,
        last_error: result.error ?? null,
      })
      .eq('id', row.id);

    await supabase.from('notification_logs').insert({
      notification_id: row.id,
      provider: transport.name,
      provider_message_id: result.providerMessageId ?? null,
      state: result.delivered ? 'SENT' : 'FAILED',
      response: (result.raw ?? {}) as Record<string, unknown>,
    });

    if (result.delivered) sent++;
    else failed++;
  }

  return { sent, failed };
}
