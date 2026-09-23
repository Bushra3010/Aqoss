import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, can } from '@/lib/auth/session';
import {
  getBookingTrend,
  getHotelPerformance,
  getCustomerReport,
  toCSV,
} from '@/services/report.service';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/reports/export?type=…&from=…&to=… — CSV export (PRD §33).
 *
 * CSV covers the Excel requirement too: every spreadsheet opens it, and it
 * avoids shipping a binary writer for data that is plain tabular.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!can(session, 'reports.read')) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'bookings';
  const from = searchParams.get('from') ?? todayISO(-30);
  const to = searchParams.get('to') ?? todayISO();

  const filters = {
    hotelScope: session!.hotelScope,
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  };

  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case 'revenue':
      rows = (await getHotelPerformance(filters)).map((h) => ({
        hotel: h.hotel,
        bookings: h.bookings,
        cancelled: h.cancelled,
        revenue_collected: h.revenue,
      }));
      break;

    case 'customers':
      rows = (await getCustomerReport(filters)).map((c) => ({
        name: c.name,
        email: c.email,
        bookings: c.bookings,
        total_spend: c.spend,
        returning: c.isReturning ? 'yes' : 'no',
        first_booking: c.firstBooking,
        last_booking: c.lastBooking,
      }));
      break;

    default:
      rows = (
        await getBookingTrend({
          hotelScope: session!.hotelScope,
          days: Math.min(
            Math.ceil(
              (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
            ) || 30,
            365,
          ),
        })
      ).map((d) => ({
        date: d.date,
        bookings: d.bookings,
        cancelled: d.cancelled,
        revenue_collected: d.revenue,
      }));
  }

  const csv = toCSV(rows);
  const filename = `aqoss-${type}-${from}-to-${to}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
