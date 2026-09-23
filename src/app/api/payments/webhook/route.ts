import { NextRequest, NextResponse } from 'next/server';
import { getPaymentAdapter } from '@/lib/payments';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { confirmBookingPayment } from '@/services/booking.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook — PRD §27, §42.
 *
 * The gateway's own callback, and the safety net when a customer closes the tab
 * before the browser reports back. The raw body is read before parsing so the
 * signature is computed over exactly the bytes that were signed.
 *
 * Always answers 200 once the signature checks out: a non-2xx makes gateways
 * retry, and a bug in our handler should not turn into a retry storm.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const adapter = getPaymentAdapter();

  const signature =
    request.headers.get('x-razorpay-signature') ??
    request.headers.get('stripe-signature') ??
    request.headers.get('x-webhook-signature');

  let verified = false;
  let event = 'unknown';
  let data: Record<string, unknown> = {};

  try {
    ({ verified, event, data } = await adapter.verifyWebhook({ rawBody, signature }));
  } catch (err) {
    console.error('[aqoss] webhook verification threw', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!verified) {
    console.warn('[aqoss] rejected webhook with bad signature');
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleEvent(event, data);
  } catch (err) {
    console.error('[aqoss] webhook handling failed', event, err);
  }

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: string, data: Record<string, unknown>) {
  const supabase = createAdminSupabase();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const entity = (data as any)?.payment?.entity ?? data;
  const orderId = entity?.order_id ?? entity?.orderId;
  const providerPaymentId = entity?.id ?? entity?.payment_id;
  const amount = entity?.amount != null ? Number(entity.amount) / 100 : null;

  if (!orderId) return;

  const { data: payment } = await supabase
    .from('payments')
    .select('id, booking_id, amount, status')
    .eq('provider_order_id', orderId)
    .maybeSingle();

  if (!payment) return;

  if (event.includes('captured') || event.includes('succeeded') || event === 'payment.paid') {
    // Idempotent: confirming an already-confirmed booking is a no-op.
    if (payment.status === 'PAID') return;

    await supabase
      .from('payments')
      .update({ provider_payment_id: providerPaymentId, raw_response: entity })
      .eq('id', payment.id);

    await confirmBookingPayment({
      bookingId: payment.booking_id,
      paymentId: payment.id,
      amount: amount ?? Number(payment.amount),
    });
  } else if (event.includes('failed')) {
    await supabase
      .from('payments')
      .update({
        status: 'FAILED',
        failure_reason: entity?.error_description ?? 'Gateway reported failure',
        raw_response: entity,
      })
      .eq('id', payment.id);
  }
}
