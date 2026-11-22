import { prisma } from "@/lib/db";
import { assertSameOrigin, handle, json, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { createReview } from "@/modules/reviews/application/reviews";
import { reviewSchema } from "@/modules/reviews/domain/review";

/** POST /api/v1/bookings/:id/review — { rating: 1–5, comment? } by the booking's student, once. */
export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const student = await requireUser("STUDENT");
    const { id } = await params;
    const input = reviewSchema.parse(await readJson(request));
    const review = await createReview(prisma, student, id, input);
    return json({ id: review.id, rating: review.rating }, 201);
  });
}
