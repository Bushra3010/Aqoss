import 'server-only';

import { cache } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError } from '@/lib/api';

/**
 * Session and permission helpers (PRD §31, §42).
 *
 * Permissions come from the database (`roles` → `role_permissions`), never from
 * a hard-coded list in the app, so changing what a Booking Manager can do is a
 * CRM operation.
 */

export interface AdminSession {
  userId: string;
  email: string | null;
  fullName: string | null;
  roleKey: string;
  roleName: string;
  permissions: Set<string>;
  /** Empty = every hotel. */
  hotelScope: string[];
}

export const getUser = cache(async () => {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The signed-in admin, or null if the user is not one. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const user = await getUser();
  if (!user) return null;

  const { data } = await createAdminSupabase()
    .from('admin_users')
    .select(
      `hotel_scope, is_active,
       profiles!inner (full_name, email),
       roles!inner (key, name, role_permissions (permissions (key)))`,
    )
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const role = Array.isArray((data as any).roles) ? (data as any).roles[0] : (data as any).roles;
  const profile = Array.isArray((data as any).profiles)
    ? (data as any).profiles[0]
    : (data as any).profiles;

  const permissions = new Set<string>(
    (role?.role_permissions ?? [])
      .map((rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions)?.key)
      .filter(Boolean),
  );

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    roleKey: role?.key ?? '',
    roleName: role?.name ?? '',
    permissions,
    hotelScope: (data as any).hotel_scope ?? [],
  };
});

export function can(session: AdminSession | null, permission: string): boolean {
  if (!session) return false;
  return session.permissions.has('*') || session.permissions.has(permission);
}

export function canAccessHotel(session: AdminSession | null, hotelId: string): boolean {
  if (!session) return false;
  return session.hotelScope.length === 0 || session.hotelScope.includes(hotelId);
}

/** Throws unless the caller is an admin holding `permission`. */
export async function requirePermission(permission: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AppError('Please sign in to continue.', 401);
  if (!can(session, permission)) {
    throw new AppError('You do not have access to this action.', 403);
  }
  return session;
}

/** Throws unless a customer is signed in. Returns their user id. */
export async function requireCustomer(): Promise<string> {
  const user = await getUser();
  if (!user) throw new AppError('Please sign in to continue.', 401);
  return user.id;
}
