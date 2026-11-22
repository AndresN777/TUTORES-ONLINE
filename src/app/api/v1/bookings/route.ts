import { prisma } from "@/lib/db";
import { assertSameOrigin, handle, json, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { createBooking, listBookingsFor } from "@/modules/bookings/application/bookings";
import { createBookingSchema } from "@/modules/bookings/domain/booking";

/** GET /api/v1/bookings — bookings where the current user participates. */
export function GET() {
  return handle(async () => {
    const user = await requireUser("STUDENT", "TUTOR");
    const rows = await listBookingsFor(prisma, user);
    return json(
      rows.map((b) => ({
        id: b.id,
        status: b.status,
        modality: b.modality,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        subject: b.subject.name,
        student: { id: b.student.id, name: `${b.student.firstName} ${b.student.lastName}` },
        tutor: { id: b.tutor.id, name: `${b.tutor.firstName} ${b.tutor.lastName}` },
        meetingUrl: b.status === "ACCEPTED" ? b.meetingUrl : null,
        meetingPlace: b.status === "ACCEPTED" ? b.meetingPlace : null,
        note: b.studentNote,
        review: b.review ? { rating: b.review.rating, comment: b.review.comment } : null,
      })),
    );
  });
}

/** POST /api/v1/bookings — { tutorId, subjectId, modality, startAt, note? } → PENDING request. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const student = await requireUser("STUDENT");
    const input = createBookingSchema.parse(await readJson(request));
    const booking = await createBooking(prisma, student, input);
    return json({ id: booking.id, status: booking.status, startAt: booking.startAt.toISOString() }, 201);
  });
}
