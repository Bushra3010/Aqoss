import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Invoice generation (PRD §13, §26).
 *
 * The invoice is stored as structured line items rather than a rendered file,
 * so it can be displayed in the dashboard, emailed, or turned into a PDF later
 * without regenerating the numbers.
 */
export async function createInvoice(bookingId: string) {
  const supabase = createAdminSupabase();

  const existing = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existing.data) return existing.data;

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, booking_rooms (room_type_name, rooms, subtotal, total), transport_bookings (route_name, seats, amount)')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;
  if (!booking) throw new Error(`Cannot invoice unknown booking ${bookingId}`);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const b = booking as any;

  const lineItems = [
    ...(b.booking_rooms ?? []).map((r: any) => ({
      description: `${r.room_type_name} × ${r.rooms}`,
      quantity: r.rooms,
      amount: Number(r.subtotal),
    })),
    ...(b.transport_bookings ?? []).map((t: any) => ({
      description: `Transport — ${t.route_name} (${t.seats} seat${t.seats > 1 ? 's' : ''})`,
      quantity: t.seats,
      amount: Number(t.amount),
    })),
  ];

  const { data: numberRow } = await supabase.rpc('next_invoice_number');

  const { data, error: insertError } = await supabase
    .from('invoices')
    .insert({
      booking_id: b.id,
      hotel_id: b.hotel_id,
      invoice_number: numberRow as unknown as string,
      issued_to: b.guest_name,
      issued_email: b.guest_email,
      currency: b.currency,
      subtotal: Number(b.room_subtotal) + Number(b.transport_total),
      discount: Number(b.discount_total),
      tax: Number(b.tax_total),
      total: Number(b.total_amount),
      line_items: lineItems,
    })
    .select('id, invoice_number')
    .single();

  if (insertError) throw insertError;
  return data;
}
