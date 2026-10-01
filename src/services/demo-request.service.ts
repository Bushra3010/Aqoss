import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';
import { recordAudit } from '@/services/audit.service';

export const DEMO_INTERESTS = [
  ['website', 'AI website'],
  ['marketing', 'AI marketing'],
  ['sales', 'AI sales'],
  ['booking', 'AI booking engine'],
  ['reputation', 'AI reputation management'],
] as const;

export type DemoRequestStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

export async function createDemoRequest(input: {
  name: string;
  hotel_name: string;
  email: string;
  phone: string;
  city?: string | null;
  rooms?: number | null;
  interests: string[];
  message?: string | null;
}) {
  const { error } = await createAdminSupabase()
    .from('demo_requests')
    .insert({
      name: input.name,
      hotel_name: input.hotel_name,
      email: input.email,
      phone: input.phone,
      city: input.city || null,
      rooms: input.rooms ?? null,
      interests: input.interests,
      message: input.message || null,
    });
  if (error) throw error;
}

export async function listDemoRequests(status?: string) {
  let query = createAdminSupabase()
    .from('demo_requests')
    .select('id, name, hotel_name, email, phone, city, rooms, interests, message, status, notes, created_at')
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
    city: string | null;
    rooms: number | null;
    interests: string[];
    message: string | null;
    status: DemoRequestStatus;
    notes: string | null;
    created_at: string;
  }[];
}

export async function updateDemoRequest(input: { id: string; status: DemoRequestStatus; notes: string | null; actorId: string }) {
  const { data, error } = await createAdminSupabase()
    .from('demo_requests')
    .update({ status: input.status, notes: input.notes, updated_by: input.actorId })
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('That request no longer exists.', 404);
  await recordAudit({ action: 'demo_request.updated', entity: 'demo_requests', entityId: input.id, actorId: input.actorId, newValue: { status: input.status } });
}
