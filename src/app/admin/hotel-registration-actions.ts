'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { toApiError } from '@/lib/api';
import { REGISTRATION_STATUSES, updateHotelRegistration, type HotelRegistrationStatus } from '@/services/hotel-registration.service';

export async function updateHotelRegistrationAction(id: string, status: HotelRegistrationStatus, notes: string): Promise<{ error?: string }> {
  try {
    const session = await requirePermission('hotel_registrations.write');
    if (!REGISTRATION_STATUSES.includes(status)) return { error: 'Unknown status.' };
    await updateHotelRegistration({ id, status, notes: notes.trim().slice(0, 2000) || null, actorId: session.userId });
    revalidatePath('/admin/hotel-registrations');
    return {};
  } catch (err) {
    return { error: toApiError(err).message };
  }
}
