import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Audit trail for admin and system actions (PRD §48).
 * Never throws: a failed audit write must not roll back the thing it records.
 */
export async function recordAudit(entry: {
  action: string;
  entity: string;
  entityId?: string | null;
  hotelId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await createAdminSupabase()
      .from('audit_logs')
      .insert({
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        hotel_id: entry.hotelId ?? null,
        actor_id: entry.actorId ?? null,
        actor_name: entry.actorName ?? null,
        old_value: entry.oldValue ?? null,
        new_value: entry.newValue ?? null,
        ip_address: entry.ipAddress ?? null,
        user_agent: entry.userAgent ?? null,
      });
  } catch (err) {
    console.error('[aqoss] audit write failed', entry.action, err);
  }
}

export async function listAuditLogs(filters: {
  hotelId?: string;
  entity?: string;
  actorId?: string;
  limit?: number;
}) {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('audit_logs')
    .select('*, profiles (full_name, email)')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.hotelId) query = query.eq('hotel_id', filters.hotelId);
  if (filters.entity) query = query.eq('entity', filters.entity);
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
