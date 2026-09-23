import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

/**
 * Consistent REST envelope + error translation (PRD §49).
 *
 * Customers see a short, actionable sentence. Anything that would leak schema
 * details, SQL or stack traces is logged server-side and replaced.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, init);
}

export function fail(error: string, status = 400, code?: string, details?: unknown) {
  return NextResponse.json<ApiResponse<never>>({ ok: false, error, code, details }, { status });
}

/** Errors we deliberately surface to the customer. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Postgres error codes our functions raise on purpose. */
const SAFE_PG_CODES = new Set(['P0001', 'P0002']);

/** Constraint violations mapped to language a guest can act on. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  room_inventory_no_oversell: 'Room no longer available. Please choose different dates.',
  transport_slots_no_oversell: 'That transport service is now full.',
  bookings_reference_key: 'Unable to process booking. Please try again.',
  reviews_booking_id_key: 'You have already reviewed this stay.',
};

export function toApiError(err: unknown): { message: string; status: number; code?: string } {
  if (err instanceof AppError) {
    return { message: err.message, status: err.status, code: err.code };
  }

  if (err instanceof ZodError) {
    const first = err.errors[0];
    return {
      message: first?.message ?? 'Please check the details you entered.',
      status: 422,
      code: 'VALIDATION',
    };
  }

  const e = err as { code?: string; message?: string; details?: string };

  if (e?.code && SAFE_PG_CODES.has(e.code) && e.message) {
    // Raised by our own PL/pgSQL with a customer-safe message.
    return { message: e.message, status: 409, code: e.code };
  }

  if (e?.code === '23514' || e?.code === '23505') {
    const hit = Object.keys(CONSTRAINT_MESSAGES).find((k) =>
      `${e.message ?? ''}${e.details ?? ''}`.includes(k),
    );
    if (hit) return { message: CONSTRAINT_MESSAGES[hit], status: 409, code: e.code };
  }

  console.error('[aqoss] unhandled error', err);
  return { message: 'Unable to process your request. Please try again.', status: 500 };
}

/** Wrap a route handler so every thrown error becomes a clean JSON response. */
export function handler<T>(fn: () => Promise<NextResponse<ApiResponse<T>>>) {
  return fn().catch((err) => {
    const { message, status, code } = toApiError(err);
    return fail(message, status, code);
  });
}
