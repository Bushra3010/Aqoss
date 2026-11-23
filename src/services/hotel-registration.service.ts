import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { recordAudit } from '@/services/audit.service';

export const REGISTRATION_STATUSES = ['NEW', 'APPROVED', 'REJECTED'] as const;
export type HotelRegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/**
 * Requests from the old "Register your hotel" form (migration 16). Owners now
 * sign up and list their property themselves (migration 18), so no new ones
 * arrive; these are kept so earlier requests can still be followed up.
 */
export async function listHotelRegistrations(status?: string) {
  let query = createAdminSupabase()
    .from('hotel_registrations')
    .select('id, name, hotel_name, email, phone, city, address, rooms, message, status, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return (data ?? []) as {
    id: string;
    name: string;
    hotel_name: string;
    email: string;
    phone: string;
    city: string;
    address: string | null;
    rooms: number | null;
    message: string | null;
    status: HotelRegistrationStatus;
    notes: string | null;
    created_at: string;
  }[];
}

export async function updateHotelRegistration(input: {
  id: string;
  status: HotelRegistrationStatus;
  notes: string | null;
  actorId: string;
}) {
  const { data, error } = await createAdminSupabase()
    .from('hotel_registrations')
    .update({ status: input.status, notes: input.notes, updated_by: input.actorId })
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('That registration no longer exists.', 404);
  await recordAudit({
    action: 'hotel_registration.updated',
    entity: 'hotel_registrations',
    entityId: input.id,
    actorId: input.actorId,
    newValue: { status: input.status },
  });
}
