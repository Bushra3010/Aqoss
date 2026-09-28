'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminSession, requirePermission } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError, toApiError } from '@/lib/api';
import { adminUserSchema, passwordSchema, roleSchema } from '@/lib/validation/schemas';
import {
  createRole,
  createStaff,
  deleteRole,
  removeStaff,
  setStaffPassword,
  updateRole,
  updateStaff,
} from '@/services/staff.service';
import { recordAudit } from '@/services/audit.service';

export type StaffFormState = { error?: string; success?: string; fieldErrors?: Record<string, string> };

/** Next.js signals redirects by throwing; let those through untouched. */
function isRedirectError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

function fieldErrorsOf(error: z.ZodError): StaffFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: 'Please fix the highlighted fields.', fieldErrors };
}

const blankToUndefined = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() === '' ? undefined : v ?? undefined);

/** A new password and its confirmation, checked together. */
function readNewPassword(formData: FormData, field = 'password'): { password?: string; error?: StaffFormState } {
  const password = String(formData.get(field) ?? '');
  const confirm = String(formData.get(`${field}_confirm`) ?? '');
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: { error: 'Please fix the highlighted fields.', fieldErrors: { [field]: parsed.error.issues[0].message } } };
  if (password !== confirm) {
    return { error: { error: 'Please fix the highlighted fields.', fieldErrors: { [`${field}_confirm`]: 'The passwords do not match.' } } };
  }
  return { password };
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function saveStaffAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  try {
    const session = await requirePermission('admins.write');
    const id = String(formData.get('admin_user_id') ?? '');

    const everyHotel = formData.get('scope') === 'all';
    const hotelIds = formData.getAll('hotel_ids').map(String).filter(Boolean);
    if (!everyHotel && !hotelIds.length) {
      return { error: 'Please fix the highlighted fields.', fieldErrors: { hotel_scope: 'Choose at least one hotel, or every hotel.' } };
    }

    const parsed = adminUserSchema.safeParse({
      full_name: blankToUndefined(formData.get('full_name')),
      email: blankToUndefined(formData.get('email')),
      mobile: blankToUndefined(formData.get('mobile')),
      role_id: blankToUndefined(formData.get('role_id')),
      hotel_scope: everyHotel ? [] : hotelIds,
      is_active: formData.get('is_active') === 'on',
    });
    if (!parsed.success) return fieldErrorsOf(parsed.error);

    if (id) {
      await updateStaff(session, id, parsed.data);
      revalidatePath('/admin', 'layout');
      redirect(`/admin/admins/${id}?saved=1`);
    }

    const { password, error } = readNewPassword(formData);
    if (error) return error;
    const newId = await createStaff(session, { ...parsed.data, password: password! });
    revalidatePath('/admin', 'layout');
    redirect(`/admin/admins/${newId}?created=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: toApiError(err).message };
  }
}

export async function setStaffPasswordAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  try {
    const session = await requirePermission('admins.write');
    const { password, error } = readNewPassword(formData);
    if (error) return error;
    await setStaffPassword(session, String(formData.get('admin_user_id') ?? ''), password!);
    return { success: 'Password changed. Share it with them privately — they can change it under My account.' };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}

export async function removeStaffAction(adminUserId: string): Promise<StaffFormState> {
  try {
    const session = await requirePermission('admins.write');
    const email = await removeStaff(session, adminUserId);
    revalidatePath('/admin', 'layout');
    redirect(`/admin/admins?removed=${encodeURIComponent(email)}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: toApiError(err).message };
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function saveRoleAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  try {
    const session = await requirePermission('admins.write');
    const id = String(formData.get('role_id') ?? '');
    const parsed = roleSchema.safeParse({
      name: blankToUndefined(formData.get('name')),
      description: blankToUndefined(formData.get('description')),
      permissions: formData.getAll('permissions').map(String),
    });
    if (!parsed.success) return fieldErrorsOf(parsed.error);
    if (!parsed.data.permissions.length) {
      return { error: 'Please fix the highlighted fields.', fieldErrors: { permissions: 'Give the role at least one permission.' } };
    }

    if (id) await updateRole(session, id, parsed.data);
    else await createRole(session, parsed.data);
    revalidatePath('/admin', 'layout');
    redirect(`/admin/admins/roles?saved=${encodeURIComponent(parsed.data.name)}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: toApiError(err).message };
  }
}

export async function deleteRoleAction(roleId: string): Promise<StaffFormState> {
  try {
    const session = await requirePermission('admins.write');
    const name = await deleteRole(session, roleId);
    revalidatePath('/admin', 'layout');
    redirect(`/admin/admins/roles?deleted=${encodeURIComponent(name)}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: toApiError(err).message };
  }
}

// ---------------------------------------------------------------------------
// My account
// ---------------------------------------------------------------------------

export async function updateMyProfileAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  try {
    const session = await getAdminSession();
    if (!session) throw new AppError('Please sign in to continue.', 401);
    const parsed = adminUserSchema.pick({ full_name: true, mobile: true }).safeParse({
      full_name: blankToUndefined(formData.get('full_name')),
      mobile: blankToUndefined(formData.get('mobile')),
    });
    if (!parsed.success) return fieldErrorsOf(parsed.error);

    await createAdminSupabase()
      .from('profiles')
      .update({ full_name: parsed.data.full_name, mobile: parsed.data.mobile ?? null })
      .eq('id', session.userId);
    revalidatePath('/admin', 'layout');
    return { success: 'Your details are saved.' };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}

/** Change your own password — the current one is checked first. */
export async function changeMyPasswordAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  try {
    const session = await getAdminSession();
    if (!session?.email) throw new AppError('Please sign in to continue.', 401);

    const current = String(formData.get('current_password') ?? '');
    if (!current) return { error: 'Please fix the highlighted fields.', fieldErrors: { current_password: 'Enter your current password.' } };
    const { password, error } = readNewPassword(formData, 'new_password');
    if (error) return error;
    if (password === current) {
      return { error: 'Please fix the highlighted fields.', fieldErrors: { new_password: 'Choose a password different from your current one.' } };
    }

    const supabase = createServerSupabase();
    const check = await supabase.auth.signInWithPassword({ email: session.email, password: current });
    if (check.error) {
      return { error: 'Please fix the highlighted fields.', fieldErrors: { current_password: 'That is not your current password.' } };
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: password! });
    if (updateError) throw new AppError(updateError.message, 400);

    await recordAudit({ action: 'staff.password_changed_self', entity: 'profiles', entityId: session.userId, actorId: session.userId });
    return { success: 'Your password is changed. Use it next time you sign in.' };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}
