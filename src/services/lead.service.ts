import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { AppError } from '@/lib/api';
import { recordAudit } from '@/services/audit.service';
import { todayISO } from '@/lib/utils';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'LOST';
export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'CONVERTED', 'LOST'];

export interface Lead {
  bookingId: string;
  reference: string;
  hotelId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  startedAt: string;
  /** Follow-up state; CONVERTED is derived from the booking once it is paid. */
  status: LeadStatus;
  notes: string | null;
  lastContactedAt: string | null;
  /** The stay date has passed, so the guest can no longer be won back for it. */
  stale: boolean;
}

const PAID_OR_LATER = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

/**
 * Abandoned bookings for one hotel, as leads.
 *
 * A booking is abandoned once it has sat PENDING/unpaid for longer than the
 * payment hold — the guest gave their contact details and walked away. Any
 * booking that already has a follow-up row stays on the list after that, so a
 * lead that converts or is marked lost does not silently vanish.
 */
export async function listLeads(hotelId: string): Promise<Lead[]> {
  const supabase = createAdminSupabase();
  const cutoff = new Date(Date.now() - env.bookingHoldMinutes * 60_000).toISOString();

  const columns =
    'id, reference, hotel_id, guest_name, guest_email, guest_phone, check_in, check_out, rooms_count, adults, children, total_amount, currency, status, payment_status, created_at';

  const [{ data: abandoned }, { data: followUps }] = await Promise.all([
    supabase
      .from('bookings')
      .select(columns)
      .eq('hotel_id', hotelId)
      .eq('status', 'PENDING')
      .eq('payment_status', 'PENDING')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('booking_leads')
      .select('booking_id, status, notes, last_contacted_at')
      .eq('hotel_id', hotelId),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const followUpByBooking = new Map((followUps ?? []).map((f: any) => [f.booking_id, f]));
  const bookings = new Map((abandoned ?? []).map((b: any) => [b.id, b]));

  // Bookings with a follow-up that are no longer pending (paid, cancelled…).
  const missing = [...followUpByBooking.keys()].filter((id) => !bookings.has(id));
  if (missing.length) {
    const { data } = await supabase.from('bookings').select(columns).in('id', missing);
    for (const b of data ?? []) bookings.set((b as any).id, b);
  }

  const today = todayISO();

  return [...bookings.values()]
    .map((b: any): Lead => {
      const f: any = followUpByBooking.get(b.id);
      const converted =
        PAID_OR_LATER.has(b.payment_status) || (b.status !== 'PENDING' && b.status !== 'CANCELLED');
      return {
        bookingId: b.id,
        reference: b.reference,
        hotelId: b.hotel_id,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
        guestPhone: b.guest_phone,
        checkIn: b.check_in,
        checkOut: b.check_out,
        rooms: b.rooms_count,
        adults: b.adults,
        children: b.children,
        totalAmount: Number(b.total_amount),
        currency: b.currency,
        startedAt: b.created_at,
        status: converted ? 'CONVERTED' : (f?.status ?? 'NEW'),
        notes: f?.notes ?? null,
        lastContactedAt: f?.last_contacted_at ?? null,
        stale: b.check_in < today,
      };
    })
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

/** Record a follow-up on an abandoned booking. */
export async function updateLead(input: {
  bookingId: string;
  status: LeadStatus;
  notes: string | null;
  actorId: string;
}) {
  const supabase = createAdminSupabase();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, hotel_id')
    .eq('id', input.bookingId)
    .maybeSingle();
  if (!booking) throw new AppError('That booking no longer exists.', 404);

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from('booking_leads')
    .select('id, status')
    .eq('booking_id', input.bookingId)
    .maybeSingle();

  const patch = {
    status: input.status,
    notes: input.notes,
    updated_by: input.actorId,
    updated_at: nowIso,
    ...(input.status === 'CONTACTED' ? { last_contacted_at: nowIso } : {}),
  };

  const { error } = existing
    ? await supabase.from('booking_leads').update(patch).eq('id', existing.id)
    : await supabase
        .from('booking_leads')
        .insert({ hotel_id: booking.hotel_id, booking_id: input.bookingId, created_at: nowIso, ...patch });
  if (error) throw error;

  await recordAudit({
    action: 'lead.updated',
    entity: 'booking_leads',
    entityId: input.bookingId,
    hotelId: booking.hotel_id,
    actorId: input.actorId,
    oldValue: existing ? { status: existing.status } : null,
    newValue: { status: input.status },
  });

  return booking.hotel_id as string;
}
