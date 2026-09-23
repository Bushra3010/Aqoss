import { NextRequest } from 'next/server';
import { ok, handler, AppError } from '@/lib/api';
import { isoDate } from '@/lib/validation/schemas';
import { z } from 'zod';
import { getTransportOptions } from '@/services/transport.service';
import { getPublishedTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const schema = z.object({ from: isoDate, to: isoDate });

/** GET /api/transport?from=&to= — transport a guest can add (PRD §16). */
export async function GET(request: NextRequest) {
  return handler(async () => {
    const input = schema.parse(Object.fromEntries(request.nextUrl.searchParams));

    const tenant = await getPublishedTenant();
    if (!tenant) throw new AppError('Unable to identify the hotel for this request.', 400);

    const slots = await getTransportOptions({
      hotelId: tenant.hotelId,
      fromDate: input.from,
      toDate: input.to,
    });

    return ok({ slots });
  });
}
