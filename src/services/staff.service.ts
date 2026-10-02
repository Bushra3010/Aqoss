import 'server-only';

import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { AdminSession } from '@/lib/auth/session';
import { AppError } from '@/lib/api';
import { adminUserSchema } from '@/lib/validation/schemas';
import { recordAudit } from '@/services/audit.service';

/**
 * Staff accounts and roles (PRD §31).
 *
 * Everything here runs with the service role, so every rule is enforced in
 * this file rather than trusted from the form:
 *  - nobody grants a role with permissions they do not hold themselves, or
 *    manages (edits, sets the password of, removes) someone whose role does;
 *  - a hotel-scoped admin only manages staff inside their own hotels;
 *  - only a super admin (`*`) touches another super admin, or edits roles;
 *  - nobody changes their own role, hotels or access (no self-lockout);
 *  - there is always at least one active, unscoped super admin.
 */

export type AdminUserInput = z.infer<typeof adminUserSchema>;

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RoleInfo {
  id: string;
  key: string;
  name: string;
  is_system: boolean;
  permissions: string[];
}

async function roleInfo(roleId: string): Promise<RoleInfo> {
  const { data } = await createAdminSupabase()
    .from('roles')
    .select('id, key, name, is_system, role_permissions (permissions (key))')
    .eq('id', roleId)
    .maybeSingle();
  if (!data) throw new AppError('That role no longer exists.', 404);
  const r = data as any;
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    is_system: r.is_system,
    permissions: (r.role_permissions ?? [])
      .map((rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions)?.key)
      .filter(Boolean),
  };
}

const isSuper = (permissions: Iterable<string>) => [...permissions].includes('*');

/** Can `actor` hand these permissions to someone? */
export function canGrant(actor: AdminSession, permissions: string[]): boolean {
  if (actor.permissions.has('*')) return true;
  return !permissions.includes('*') && permissions.every((p) => actor.permissions.has(p));
}

/** Is this hotel scope within the actor's own? (Empty = every hotel.) */
export function scopeAllowed(actor: AdminSession, scope: string[]): boolean {
  if (!actor.hotelScope.length) return true;
  return scope.length > 0 && scope.every((id) => actor.hotelScope.includes(id));
}

interface StaffTarget {
  id: string;
  profile_id: string;
  role_id: string;
  hotel_scope: string[];
  is_active: boolean;
  email: string;
  full_name: string | null;
  mobile: string | null;
  role: RoleInfo;
}

export async function getStaff(adminUserId: string): Promise<StaffTarget | null> {
  const { data } = await createAdminSupabase()
    .from('admin_users')
    .select('id, profile_id, role_id, hotel_scope, is_active, profiles!admin_users_profile_id_fkey!inner (email, full_name, mobile)')
    .eq('id', adminUserId)
    .maybeSingle();
  if (!data) return null;
  const row = data as any;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    profile_id: row.profile_id,
    role_id: row.role_id,
    hotel_scope: row.hotel_scope ?? [],
    is_active: row.is_active,
    email: profile?.email,
    full_name: profile?.full_name ?? null,
    mobile: profile?.mobile ?? null,
    role: await roleInfo(row.role_id),
  };
}

/** Throws unless `actor` may manage this staff member at all. */
export function assertCanManage(actor: AdminSession, target: StaffTarget) {
  if (isSuper(target.role.permissions) && !actor.permissions.has('*')) {
    throw new AppError('Only a super admin can change another super admin.', 403);
  }
  // Setting someone's password is as good as signing in as them, so nobody
  // manages a person whose role can do more than their own.
  if (!canGrant(actor, target.role.permissions)) {
    throw new AppError(`Their role (${target.role.name}) can do things yours cannot, so you cannot manage their account.`, 403);
  }
  if (!scopeAllowed(actor, target.hotel_scope)) {
    throw new AppError('This person works outside your assigned hotels.', 403);
  }
}

/** Throws if the change would leave no active, all-hotels super admin. */
async function assertKeepsSuperAdmin(target: StaffTarget, after: { active: boolean; roleIsSuper: boolean; scope: string[] }) {
  const wasSuper = target.is_active && isSuper(target.role.permissions) && target.hotel_scope.length === 0;
  const staysSuper = after.active && after.roleIsSuper && after.scope.length === 0;
  if (!wasSuper || staysSuper) return;

  const { data } = await createAdminSupabase()
    .from('admin_users')
    .select('id, hotel_scope, roles!inner (role_permissions (permissions (key)))')
    .eq('is_active', true);
  const others = ((data ?? []) as any[]).filter((a) => {
    if (a.id === target.id || (a.hotel_scope ?? []).length) return false;
    const role = Array.isArray(a.roles) ? a.roles[0] : a.roles;
    return (role?.role_permissions ?? []).some(
      (rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions)?.key === '*',
    );
  });
  if (!others.length) {
    throw new AppError('This is the last super admin with access to every hotel. Add another before changing this one.', 409);
  }
}

function checkNewAccess(actor: AdminSession, role: RoleInfo, scope: string[]) {
  if (!canGrant(actor, role.permissions)) {
    throw new AppError(`You cannot give the ${role.name} role: it has permissions you don't have.`, 403);
  }
  if (!scopeAllowed(actor, scope)) {
    throw new AppError(actor.hotelScope.length ? 'Choose hotels from your own assignment.' : 'Choose the hotels.', 403);
  }
}

// ---------------------------------------------------------------------------
// Create / update / remove
// ---------------------------------------------------------------------------

export async function createStaff(actor: AdminSession, input: AdminUserInput & { password: string }) {
  const supabase = createAdminSupabase();
  const role = await roleInfo(input.role_id);
  checkNewAccess(actor, role, input.hotel_scope);

  // An existing account (a guest, most likely) is not silently turned into
  // staff with a new password — that would take the account over.
  const { data: existing } = await supabase.from('profiles').select('id').ilike('email', input.email).maybeSingle();
  if (existing) throw new AppError('Someone already has an account with this email. Use a different email address.', 409);

  const { data: created, error } = await (supabase.auth as any).admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, mobile: input.mobile ?? null },
  });
  if (error || !created?.user) throw new AppError(error?.message ?? 'The account could not be created.', 400);
  const profileId = created.user.id as string;

  // The profile row comes from the auth trigger (or the demo stand-in); make
  // sure it carries what the form entered.
  await supabase
    .from('profiles')
    .update({ full_name: input.full_name, mobile: input.mobile ?? null, is_admin: true })
    .eq('id', profileId);

  const { data: adminUser, error: insertError } = await supabase
    .from('admin_users')
    .insert({
      profile_id: profileId,
      role_id: role.id,
      hotel_scope: input.hotel_scope,
      is_active: input.is_active,
      created_by: actor.userId,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;

  await recordAudit({
    action: 'staff.created',
    entity: 'admin_users',
    entityId: adminUser.id,
    actorId: actor.userId,
    newValue: { email: input.email, role: role.key, hotels: input.hotel_scope.length || 'all' },
  });
  return adminUser.id as string;
}

export async function updateStaff(actor: AdminSession, adminUserId: string, input: AdminUserInput) {
  const supabase = createAdminSupabase();
  const target = await getStaff(adminUserId);
  if (!target) throw new AppError('That person no longer has an account.', 404);
  assertCanManage(actor, target);

  const role = await roleInfo(input.role_id);
  const self = target.profile_id === actor.userId;
  const accessChanged =
    role.id !== target.role_id ||
    input.is_active !== target.is_active ||
    [...input.hotel_scope].sort().join() !== [...target.hotel_scope].sort().join();

  if (self && accessChanged) {
    throw new AppError('You cannot change your own role, hotels or access. Ask another admin.', 403);
  }
  if (accessChanged) {
    checkNewAccess(actor, role, input.hotel_scope);
    await assertKeepsSuperAdmin(target, { active: input.is_active, roleIsSuper: isSuper(role.permissions), scope: input.hotel_scope });
  }

  if (input.email !== target.email) {
    const { error } = await (supabase.auth as any).admin.updateUserById(target.profile_id, { email: input.email, email_confirm: true });
    if (error) throw new AppError(error.message, 400);
  }
  await (supabase.auth as any).admin.updateUserById(target.profile_id, {
    user_metadata: { full_name: input.full_name, mobile: input.mobile ?? null },
    // Deactivated staff cannot sign in at all, not just lose the CRM.
    ban_duration: input.is_active ? 'none' : '876000h',
  });
  await supabase
    .from('profiles')
    .update({ full_name: input.full_name, email: input.email, mobile: input.mobile ?? null })
    .eq('id', target.profile_id);
  await supabase
    .from('admin_users')
    .update({ role_id: role.id, hotel_scope: input.hotel_scope, is_active: input.is_active })
    .eq('id', target.id);

  await recordAudit({
    action: 'staff.updated',
    entity: 'admin_users',
    entityId: target.id,
    actorId: actor.userId,
    oldValue: { email: target.email, role: target.role.key, active: target.is_active, hotels: target.hotel_scope.length || 'all' },
    newValue: { email: input.email, role: role.key, active: input.is_active, hotels: input.hotel_scope.length || 'all' },
  });
}

export async function setStaffPassword(actor: AdminSession, adminUserId: string, password: string) {
  const target = await getStaff(adminUserId);
  if (!target) throw new AppError('That person no longer has an account.', 404);
  assertCanManage(actor, target);
  if (target.profile_id === actor.userId) {
    throw new AppError('Change your own password under My account, where your current password is checked.', 403);
  }

  const { error } = await (createAdminSupabase().auth as any).admin.updateUserById(target.profile_id, { password });
  if (error) throw new AppError(error.message, 400);

  // The password itself is never written to the audit log.
  await recordAudit({ action: 'staff.password_set', entity: 'admin_users', entityId: target.id, actorId: actor.userId });
}

/**
 * Take away someone's staff access. The account is blocked rather than
 * deleted: bookings and audit entries they created keep pointing at it.
 */
export async function removeStaff(actor: AdminSession, adminUserId: string) {
  const supabase = createAdminSupabase();
  const target = await getStaff(adminUserId);
  if (!target) throw new AppError('That person no longer has an account.', 404);
  assertCanManage(actor, target);
  if (target.profile_id === actor.userId) throw new AppError('You cannot remove your own access.', 403);
  await assertKeepsSuperAdmin(target, { active: false, roleIsSuper: false, scope: [] });

  await (supabase.auth as any).admin.updateUserById(target.profile_id, { ban_duration: '876000h' });
  const { error } = await supabase.from('admin_users').delete().eq('id', target.id);
  if (error) throw error;
  await supabase.from('profiles').update({ is_admin: false }).eq('id', target.profile_id);

  await recordAudit({
    action: 'staff.removed',
    entity: 'admin_users',
    entityId: target.id,
    actorId: actor.userId,
    oldValue: { email: target.email, role: target.role.key },
  });
  return target.email;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export interface RoleSummary extends RoleInfo {
  description: string | null;
  users: number;
}

export async function listRoles(): Promise<RoleSummary[]> {
  const supabase = createAdminSupabase();
  const [{ data: roles }, { data: staff }] = await Promise.all([
    supabase.from('roles').select('id, key, name, description, is_system, role_permissions (permissions (key))').order('name'),
    supabase.from('admin_users').select('role_id'),
  ]);
  const counts = new Map<string, number>();
  for (const s of staff ?? []) counts.set(s.role_id, (counts.get(s.role_id) ?? 0) + 1);

  return ((roles ?? []) as any[]).map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    is_system: r.is_system,
    users: counts.get(r.id) ?? 0,
    permissions: (r.role_permissions ?? [])
      .map((rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions)?.key)
      .filter(Boolean)
      .sort(),
  }));
}

export async function listPermissions() {
  const { data } = await createAdminSupabase().from('permissions').select('id, key, module, action, description').order('key');
  // `*` is the super admin's alone; it is never offered to a role.
  return ((data ?? []) as { id: string; key: string; module: string; action: string; description: string | null }[]).filter(
    (p) => p.key !== '*',
  );
}

function assertCanEditRoles(actor: AdminSession) {
  if (!actor.permissions.has('*') || actor.hotelScope.length) {
    throw new AppError('Only a super admin can create or change roles — they apply to every hotel.', 403);
  }
}

async function writeRolePermissions(roleId: string, keys: string[]) {
  const supabase = createAdminSupabase();
  const valid = await listPermissions();
  const ids = valid.filter((p) => keys.includes(p.key)).map((p) => p.id);

  const { error } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
  if (error) throw error;
  if (ids.length) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(ids.map((permission_id) => ({ role_id: roleId, permission_id })));
    if (insertError) throw insertError;
  }
}

export async function createRole(actor: AdminSession, input: { name: string; description?: string | null; permissions: string[] }) {
  assertCanEditRoles(actor);
  const supabase = createAdminSupabase();

  const base = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'role';
  const { data: taken } = await supabase.from('roles').select('key');
  const keys = new Set((taken ?? []).map((r) => r.key));
  let key = base;
  for (let n = 2; keys.has(key); n++) key = `${base}_${n}`;

  const { data, error } = await supabase
    .from('roles')
    .insert({ key, name: input.name, description: input.description || null, is_system: false })
    .select('id')
    .single();
  if (error) throw error;
  await writeRolePermissions(data.id, input.permissions);

  await recordAudit({ action: 'role.created', entity: 'roles', entityId: data.id, actorId: actor.userId, newValue: { key, permissions: input.permissions } });
  return data.id as string;
}

export async function updateRole(
  actor: AdminSession,
  roleId: string,
  input: { name: string; description?: string | null; permissions: string[] },
) {
  assertCanEditRoles(actor);
  const role = await roleInfo(roleId);
  if (isSuper(role.permissions)) {
    throw new AppError('The Super Admin role always has every permission and cannot be edited.', 409);
  }

  await createAdminSupabase()
    .from('roles')
    .update({ name: input.name, description: input.description || null })
    .eq('id', roleId);
  await writeRolePermissions(roleId, input.permissions);

  await recordAudit({
    action: 'role.updated',
    entity: 'roles',
    entityId: roleId,
    actorId: actor.userId,
    oldValue: { name: role.name, permissions: role.permissions },
    newValue: { name: input.name, permissions: input.permissions },
  });
}

export async function deleteRole(actor: AdminSession, roleId: string) {
  assertCanEditRoles(actor);
  const supabase = createAdminSupabase();
  const role = await roleInfo(roleId);
  if (role.is_system) throw new AppError(`${role.name} is a built-in role and cannot be deleted.`, 409);

  const { count } = await supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('role_id', roleId);
  if (count) {
    throw new AppError(`${count} ${count === 1 ? 'person has' : 'people have'} this role. Move them to another role first.`, 409);
  }

  await supabase.from('role_permissions').delete().eq('role_id', roleId);
  const { error } = await supabase.from('roles').delete().eq('id', roleId);
  if (error) throw error;

  await recordAudit({ action: 'role.deleted', entity: 'roles', entityId: roleId, actorId: actor.userId, oldValue: { key: role.key } });
  return role.name;
}
