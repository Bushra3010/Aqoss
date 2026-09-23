import { NextRequest } from 'next/server';
import { ok, handler } from '@/lib/api';
import { releaseHold } from '@/services/availability.service';

export const dynamic = 'force-dynamic';

/** DELETE /api/holds/:id — release a hold when the customer backs out. */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  return handler(async () => {
    await releaseHold(params.id);
    return ok({ released: true });
  });
}
