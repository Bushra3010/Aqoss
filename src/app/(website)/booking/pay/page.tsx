import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { MockCheckout } from '@/components/booking/MockCheckout';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payment' };

const schema = z.object({
  booking: z.string().uuid(),
  payment: z.string().uuid(),
  order: z.string(),
  reference: z.string(),
});

/**
 * Payment step (PRD §13).
 *
 * With a real gateway this page mounts its checkout widget. With the mock
 * gateway it renders a test checkout that goes through the same server-side
 * verification.
 */
export default async function PayPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = schema.safeParse(searchParams);
  if (!parsed.success) redirect('/rooms');

  const supabase = createAdminSupabase();
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, reference, total_amount, currency, payment_status, guest_name, guest_email, check_in, check_out')
    .eq('id', parsed.data.booking)
    .maybeSingle();

  if (!booking) notFound();

  if (booking.payment_status === 'PAID') {
    redirect(`/booking/confirmation/${booking.reference}`);
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="section-title">Payment</h1>
      <p className="mt-2 text-slate-600">
        Booking {booking.reference} · {booking.guest_name}
      </p>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <span className="text-slate-600">Amount due</span>
          <span className="text-2xl font-bold text-slate-900">
            {formatCurrency(Number(booking.total_amount), booking.currency)}
          </span>
        </div>

        <div className="mt-6">
          {env.paymentProvider === 'mock' ? (
            <MockCheckout
              paymentId={parsed.data.payment}
              orderId={parsed.data.order}
              amount={Number(booking.total_amount)}
              reference={booking.reference}
            />
          ) : (
            <p className="text-sm text-slate-600">
              The {env.paymentProvider} checkout widget mounts here. Configure the gateway keys and
              wire its callback to <code className="rounded bg-slate-100 px-1">/api/payments/verify</code>.
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Your room is reserved until payment completes. If payment fails, the room is released
        automatically.
      </p>
    </div>
  );
}
