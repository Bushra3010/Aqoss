import { NextRequest } from 'next/server';
import { ok, handler } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { reviewSchema } from '@/lib/validation/schemas';
import { submitReview } from '@/services/review.service';
import { requireCustomer } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** POST /api/reviews — PRD §19. Only a completed stay can be reviewed. */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'review'), { limit: 5, windowMs: 60_000 });

    const customerId = await requireCustomer();
    const input = reviewSchema.parse(await request.json());

    const review = await submitReview({
      bookingId: input.booking_id,
      customerId,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      subRatings: {
        cleanliness: input.cleanliness_rating,
        service: input.service_rating,
        location: input.location_rating,
        value: input.value_rating,
      },
      images: input.images,
    });

    return ok(
      { review_id: review.id, status: review.status },
      { status: 201 },
    );
  });
}
