import { NextRequest } from 'next/server';
import { ok, handler, AppError } from '@/lib/api';
import { getTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * GET /api/websites/resolve — which hotel is this hostname serving? (PRD §38)
 * Useful for debugging domain mapping during setup.
 */
export async function GET(_request: NextRequest) {
  return handler(async () => {
    const tenant = await getTenant();
    if (!tenant) throw new AppError('No website is mapped to this hostname.', 404);
    return ok(tenant);
  });
}
