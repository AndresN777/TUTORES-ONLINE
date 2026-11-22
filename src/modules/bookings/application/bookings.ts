import { Prisma, type PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";
import { formatDate, formatTime, localDateOf, mondayOf } from "@/lib/utils/time";
import { buildWeekSlots } from "@/modules/availability/domain/slots";
import { notify } from "@/modules/notifications/application/notifications";
import { meetingPlaceSchema, meetingUrlSchema, nextStatus, type CreateBookingInput } from "../domain/booking";

type Actor = { id: string; role: "STUDENT" | "TUTOR" | "ADMIN" };

const when = (d: Date, tz: string) => `${formatDate(d, tz)} a las ${formatTime(d, tz)}`;

/**
 * Creates a PENDING request. The slot must come from the tutor's published
 * availability and must not overlap an accepted session.
 *
 * Concurrency note: SQLite serialises writers, the checks and the insert run in
 * one transaction, and accepting is additionally guarded by a partial unique
 * index (one ACCEPTED booking per tutor and start time).
 */
export async function createBooking(db: PrismaClient, student: Actor, input: CreateBookingInput, now = new Date()) {
  if (student.role !== "STUDENT") throw new DomainError("FORBIDDEN", "Solo los estudiantes pueden solicitar tutorías.");
  if (student.id === input.tutorId) throw new DomainError("VALIDATION", "No puedes reservar contigo mismo.");

  return db.$transaction(async (tx) => {
    const tutor = await tx.user.findFirst({
      where: { id: input.tutorId, role: "TUTOR", status: "ACTIVE", tutorProfile: { verification: "APPROVED" } },
      select: {
        firstName: true,
        timezone: true,
        tutorProfile: {
          select: {
            slotMinutes: true,
            offersVirtual: true,
            offersInPerson: true,
            subjects: { where: { subjectId: input.subjectId, subject: { active: true } }, select: { subjectId: true } },
            availability: { select: { weekday: true, startMinute: true } },
            exceptions: { select: { date: true } },
          },
        },
      },
    });
    const profile = tutor?.tutorProfile;
    if (!tutor || !profile) throw new DomainError("NOT_FOUND", "El profesor no está disponible.");
    if (profile.subjects.length === 0) throw new DomainError("VALIDATION", "El profesor no enseña esa materia.");
    if (input.modality === "VIRTUAL" && !profile.offersVirtual) throw new DomainError("VALIDATION", "El profesor no ofrece tutorías virtuales.");
    if (input.modality === "IN_PERSON" && !profile.offersInPerson) throw new DomainError("VALIDATION", "El profesor no ofrece tutorías presenciales.");

    const busy = await tx.booking.findMany({
      where: { tutorId: input.tutorId, status: "ACCEPTED" },
      select: { startAt: true, endAt: true },
    });
    const week = buildWeekSlots({
      weekStart: mondayOf(localDateOf(input.startAt, tutor.timezone)),
      slots: profile.availability,
      exceptions: profile.exceptions.map((e) => e.date),
      slotMinutes: profile.slotMinutes,
      timeZone: tutor.timezone,
      busy,
      now,
    });
    const slot = week.find((s) => s.startAt.getTime() === input.startAt.getTime());
    if (!slot || !slot.available) throw new DomainError("CONFLICT", "Ese horario ya no está disponible. Elige otro.");

    const clash = await tx.booking.findFirst({
      where: {
        studentId: student.id,
        status: { in: ["PENDING", "ACCEPTED"] },
        startAt: { lt: slot.endAt },
        endAt: { gt: slot.startAt },
      },
      select: { id: true },
    });
    if (clash) throw new DomainError("CONFLICT", "Ya tienes una tutoría o solicitud en ese horario.");

    const booking = await tx.booking.create({
      data: {
        studentId: student.id,
        tutorId: input.tutorId,
        subjectId: input.subjectId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        modality: input.modality,
        studentNote: input.note || null,
      },
      include: { student: { select: { firstName: true, lastName: true } }, subject: { select: { name: true } } },
    });
    await notify(
      tx,
      input.tutorId,
      `Nueva solicitud de ${booking.student.firstName} ${booking.student.lastName} — ${booking.subject.name}, ${when(slot.startAt, tutor.timezone)}.`,
      "/tutor",
    );
    return booking;
  });
}

async function loadForActor(tx: Db, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { firstName: true, lastName: true, timezone: true } },
      tutor: { select: { firstName: true, lastName: true, timezone: true } },
      subject: { select: { name: true } },
    },
  });
  if (!booking) throw new DomainError("NOT_FOUND", "La tutoría no existe.");
  return booking;
}

export type AcceptDetails = { meetingUrl?: string; meetingPlace?: string };

export async function acceptBooking(db: PrismaClient, tutor: Actor, bookingId: string, details: AcceptDetails, now = new Date()) {
  try {
    return await db.$transaction(async (tx) => {
      const b = await loadForActor(tx, bookingId);
      nextStatus(b, "accept", tutor, now);

      const data: Prisma.BookingUpdateInput = { status: "ACCEPTED" };
      if (b.modality === "VIRTUAL") {
        const url = meetingUrlSchema.safeParse(details.meetingUrl ?? "");
        if (!url.success) throw new DomainError("VALIDATION", url.error.issues[0].message);
        data.meetingUrl = url.data;
      } else {
        const place = meetingPlaceSchema.safeParse(details.meetingPlace ?? "");
        if (!place.success) throw new DomainError("VALIDATION", place.error.issues[0].message);
        data.meetingPlace = place.data;
      }

      const conflict = await tx.booking.findFirst({
        where: { tutorId: b.tutorId, status: "ACCEPTED", startAt: { lt: b.endAt }, endAt: { gt: b.startAt } },
        select: { id: true },
      });
      if (conflict) {
        throw new DomainError("CONFLICT", `Conflicto de horario: ya tienes una tutoría aceptada el ${when(b.startAt, b.tutor.timezone)}.`);
      }

      const updated = await tx.booking.update({ where: { id: b.id }, data });
      await notify(tx, b.studentId, `${b.tutor.firstName} ${b.tutor.lastName} aceptó tu solicitud de ${b.subject.name} para el ${when(b.startAt, b.student.timezone)}.`, "/student/bookings");

      // Other pending requests for the same time can no longer be honoured.
      const competing = await tx.booking.findMany({
        where: { tutorId: b.tutorId, status: "PENDING", id: { not: b.id }, startAt: { lt: b.endAt }, endAt: { gt: b.startAt } },
        include: { student: { select: { timezone: true } } },
      });
      for (const c of competing) {
        await tx.booking.update({ where: { id: c.id }, data: { status: "REJECTED" } });
        await notify(tx, c.studentId, `Tu solicitud de ${b.subject.name} del ${when(c.startAt, c.student.timezone)} fue declinada: el horario ya se ocupó.`, "/student/bookings");
      }
      return updated;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("CONFLICT", "Conflicto de horario: ese bloque acaba de ser ocupado.");
    }
    throw error;
  }
}

export async function rejectBooking(db: PrismaClient, tutor: Actor, bookingId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const b = await loadForActor(tx, bookingId);
    nextStatus(b, "reject", tutor, now);
    const updated = await tx.booking.update({ where: { id: b.id }, data: { status: "REJECTED" } });
    await notify(tx, b.studentId, `${b.tutor.firstName} ${b.tutor.lastName} declinó tu solicitud de ${b.subject.name}.`, "/student/bookings");
    return updated;
  });
}

export async function cancelBooking(db: PrismaClient, actor: Actor, bookingId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const b = await loadForActor(tx, bookingId);
    nextStatus(b, "cancel", actor, now);
    const updated = await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledBy: actor.id } });
    const byStudent = actor.id === b.studentId;
    const who = byStudent ? `${b.student.firstName} ${b.student.lastName}` : `${b.tutor.firstName} ${b.tutor.lastName}`;
    const recipient = byStudent ? b.tutorId : b.studentId;
    const tz = byStudent ? b.tutor.timezone : b.student.timezone;
    await notify(tx, recipient, `${who} canceló la tutoría de ${b.subject.name} del ${when(b.startAt, tz)}.`, byStudent ? "/tutor/bookings" : "/student/bookings");
    return updated;
  });
}

export async function completeBooking(db: PrismaClient, tutor: Actor, bookingId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const b = await loadForActor(tx, bookingId);
    nextStatus(b, "complete", tutor, now);
    const updated = await tx.booking.update({ where: { id: b.id }, data: { status: "COMPLETED" } });
    await notify(tx, b.studentId, `Tu tutoría de ${b.subject.name} con ${b.tutor.firstName} fue marcada como completada. ¡Ya puedes calificarla!`, "/student/bookings");
    return updated;
  });
}

/** Lets the tutor change the external meeting link or the meeting point of an upcoming session. */
export async function updateMeetingDetails(db: PrismaClient, tutor: Actor, bookingId: string, details: AcceptDetails, now = new Date()) {
  return db.$transaction(async (tx) => {
    const b = await loadForActor(tx, bookingId);
    if (tutor.role !== "TUTOR" || b.tutorId !== tutor.id) throw new DomainError("FORBIDDEN", "No tienes permiso sobre esta tutoría.");
    if (b.status !== "ACCEPTED" || b.startAt <= now) throw new DomainError("CONFLICT", "Solo puedes editar tutorías aceptadas que aún no comienzan.");
    if (b.modality === "VIRTUAL") {
      const url = meetingUrlSchema.safeParse(details.meetingUrl ?? "");
      if (!url.success) throw new DomainError("VALIDATION", url.error.issues[0].message);
      await tx.booking.update({ where: { id: b.id }, data: { meetingUrl: url.data } });
      await notify(tx, b.studentId, `${b.tutor.firstName} actualizó el enlace de la reunión de ${b.subject.name} del ${when(b.startAt, b.student.timezone)}.`, "/student/bookings");
    } else {
      const place = meetingPlaceSchema.safeParse(details.meetingPlace ?? "");
      if (!place.success) throw new DomainError("VALIDATION", place.error.issues[0].message);
      await tx.booking.update({ where: { id: b.id }, data: { meetingPlace: place.data } });
      await notify(tx, b.studentId, `${b.tutor.firstName} actualizó el punto de encuentro de ${b.subject.name}.`, "/student/bookings");
    }
  });
}

const listInclude = {
  subject: { select: { name: true, slug: true } },
  student: { select: { id: true, firstName: true, lastName: true, avatarFile: true } },
  tutor: { select: { id: true, firstName: true, lastName: true, avatarFile: true } },
  review: { select: { rating: true, comment: true, status: true } },
} satisfies Prisma.BookingInclude;

export type BookingListItem = Prisma.BookingGetPayload<{ include: typeof listInclude }>;

/** Every booking where the user participates. Meeting details stay private to both parties. */
export function listBookingsFor(db: Db, user: Actor): Promise<BookingListItem[]> {
  const where: Prisma.BookingWhereInput = user.role === "TUTOR" ? { tutorId: user.id } : { studentId: user.id };
  return db.booking.findMany({ where, include: listInclude, orderBy: { startAt: "asc" } });
}

export function nextAcceptedBooking(db: Db, user: Actor, now = new Date()) {
  const where: Prisma.BookingWhereInput = user.role === "TUTOR" ? { tutorId: user.id } : { studentId: user.id };
  return db.booking.findFirst({
    where: { ...where, status: "ACCEPTED", startAt: { gte: now } },
    include: listInclude,
    orderBy: { startAt: "asc" },
  });
}
