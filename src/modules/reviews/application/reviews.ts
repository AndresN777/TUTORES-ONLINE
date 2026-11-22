import type { PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";
import { notify } from "@/modules/notifications/application/notifications";
import { summarizeRatings, type RatingSummary } from "../domain/review";

type Actor = { id: string; role: "STUDENT" | "TUTOR" | "ADMIN" };

/** One review per completed booking, written only by that booking's student. */
export async function createReview(db: PrismaClient, student: Actor, bookingId: string, input: { rating: number; comment?: string }) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { studentId: true, tutorId: true, status: true, review: { select: { id: true } }, student: { select: { firstName: true } } },
    });
    if (!booking) throw new DomainError("NOT_FOUND", "La tutoría no existe.");
    if (student.role !== "STUDENT" || booking.studentId !== student.id) throw new DomainError("FORBIDDEN", "Solo el estudiante de esta tutoría puede calificarla.");
    if (booking.status !== "COMPLETED") throw new DomainError("CONFLICT", "Solo puedes calificar tutorías completadas.");
    if (booking.review) throw new DomainError("CONFLICT", "Ya calificaste esta tutoría.");
    const review = await tx.review.create({
      data: { bookingId, studentId: student.id, tutorId: booking.tutorId, rating: input.rating, comment: input.comment || null },
    });
    await notify(tx, booking.tutorId, `${booking.student.firstName} calificó tu tutoría con ${input.rating} ${input.rating === 1 ? "estrella" : "estrellas"}.`, "/tutor/profile");
    return review;
  });
}

/** Tutors can flag reviews about themselves; only an admin decides what happens. */
export async function reportReview(db: Db, tutor: Actor, reviewId: string, reason: string): Promise<void> {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { tutorId: true, status: true } });
  if (!review) throw new DomainError("NOT_FOUND", "La reseña no existe.");
  if (tutor.role !== "TUTOR" || review.tutorId !== tutor.id) throw new DomainError("FORBIDDEN", "Solo puedes reportar reseñas sobre ti.");
  if (review.status !== "PUBLISHED") throw new DomainError("CONFLICT", "La reseña ya no está publicada.");
  await db.review.update({ where: { id: reviewId }, data: { reportReason: reason, reportedAt: new Date() } });
}

export type ModerationAction = "hide" | "restore" | "dismiss";

/** Admins never edit ratings: they can only hide, restore, or clear a report. */
export async function moderateReview(db: Db, admin: Actor, reviewId: string, action: ModerationAction): Promise<void> {
  if (admin.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Solo un administrador puede moderar reseñas.");
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { status: true, reportedAt: true } });
  if (!review) throw new DomainError("NOT_FOUND", "La reseña no existe.");
  if (action === "hide") {
    if (review.status === "HIDDEN") throw new DomainError("CONFLICT", "La reseña ya está oculta.");
    await db.review.update({ where: { id: reviewId }, data: { status: "HIDDEN", reportReason: null, reportedAt: null } });
  } else if (action === "restore") {
    if (review.status !== "HIDDEN") throw new DomainError("CONFLICT", "La reseña ya está publicada.");
    await db.review.update({ where: { id: reviewId }, data: { status: "PUBLISHED" } });
  } else {
    if (!review.reportedAt) throw new DomainError("CONFLICT", "La reseña no tiene reportes.");
    await db.review.update({ where: { id: reviewId }, data: { reportReason: null, reportedAt: null } });
  }
}

/** Published-review ratings for many tutors at once. */
export async function ratingsFor(db: Db, tutorIds: string[]): Promise<Map<string, RatingSummary>> {
  const rows = await db.review.findMany({
    where: { tutorId: { in: tutorIds }, status: "PUBLISHED" },
    select: { tutorId: true, rating: true },
  });
  const byTutor = new Map<string, number[]>();
  for (const r of rows) byTutor.set(r.tutorId, [...(byTutor.get(r.tutorId) ?? []), r.rating]);
  return new Map(tutorIds.map((id) => [id, summarizeRatings(byTutor.get(id) ?? [])]));
}

export function listTutorReviews(db: Db, tutorId: string, take?: number) {
  return db.review.findMany({
    where: { tutorId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      reportedAt: true,
      student: { select: { firstName: true, lastName: true } },
      booking: { select: { startAt: true, subject: { select: { name: true } } } },
    },
  });
}

export function listReviewsForModeration(db: Db) {
  return db.review.findMany({
    orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      rating: true,
      comment: true,
      status: true,
      reportReason: true,
      reportedAt: true,
      createdAt: true,
      student: { select: { firstName: true, lastName: true } },
      tutor: { select: { firstName: true, lastName: true } },
      booking: { select: { startAt: true, subject: { select: { name: true } } } },
    },
  });
}
