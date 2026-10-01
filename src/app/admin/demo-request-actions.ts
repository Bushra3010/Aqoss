'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { toApiError } from '@/lib/api';
import { updateDemoRequest, type DemoRequestStatus } from '@/services/demo-request.service';

export async function updateDemoRequestAction(id: string, status: DemoRequestStatus, notes: string): Promise<{ error?: string }> {
  try {
    const session = await requirePermission('demo_requests.write');
    if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) return { error: 'Unknown status.' };
    await updateDemoRequest({ id, status, notes: notes.trim().slice(0, 2000) || null, actorId: session.userId });
    revalidatePath('/admin/demo-requests');
    return {};
  } catch (err) {
    return { error: toApiError(err).message };
  }
}
