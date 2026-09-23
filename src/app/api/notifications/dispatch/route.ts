import { NextRequest, NextResponse } from 'next/server';
import { dispatchQueued } from '@/services/notification.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/notifications/dispatch — drains the notification outbox (PRD §28).
 *
 * Point a cron job at it (Vercel Cron, GitHub Actions, or any scheduler) and
 * protect it with CRON_SECRET so it is not publicly triggerable.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    request.nextUrl.searchParams.get('secret');

  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await dispatchQueued(100);
  return NextResponse.json({ ok: true, data: result });
}
