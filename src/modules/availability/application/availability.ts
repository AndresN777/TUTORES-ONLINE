import type { PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";
import { addDays, localDateOf, localMinuteOf, mondayOf, weekdayOf } from "@/lib/utils/time";
import { BOOKING_WINDOW_WEEKS, buildWeekSlots, type AvailabilityInput } from "../domain/slots";

async function loadTutor(db: Db, tutorId: string) {
  const tutor = await db.user.findUnique({
    where: { id: tutorId },
    select: {
      timezone: true,
      tutorProfile: {
        select: {
          slotMinutes: true,
          availability: { select: { weekday: true, startMinute: true } },
          exceptions: { select: { date: true }, orderBy: { date: "asc" } },
        },
      },
    },
  });
  if (!tutor?.tutorProfile) throw new DomainError("NOT_FOUND", "El profesor no existe.");
  return { timezone: tutor.timezone, ...tutor.tutorProfile };
}

/** Tutor's editable weekly template plus the cells locked by upcoming accepted sessions. */
export async function getAvailability(db: Db, tutorId: string, now = new Date()) {
  const t = await loadTutor(db, tutorId);
  const accepted = await db.booking.findMany({
    where: { tutorId, status: "ACCEPTED", startAt: { gte: now } },
    select: { startAt: true },
  });
  const booked = accepted.map((b) => ({
    weekday: weekdayOf(localDateOf(b.startAt, t.timezone)),
    startMinute: localMinuteOf(b.startAt, t.timezone),
  }));
  return {
    timezone: t.timezone,
    slotMinutes: t.slotMinutes,
    slots: t.availability,
    exceptions: t.exceptions.map((e) => e.date),
    booked,
  };
}

/** Replaces the weekly template atomically. Existing bookings are kept as they are. */
export async function saveAvailability(db: PrismaClient, tutorId: string, input: AvailabilityInput): Promise<void> {
  const unique = new Map(input.slots.map((s) => [`${s.weekday}-${s.startMinute}`, s]));
  await db.$transaction([
    db.user.update({ where: { id: tutorId }, data: { timezone: input.timezone } }),
    db.tutorProfile.update({ where: { userId: tutorId }, data: { slotMinutes: input.slotMinutes } }),
    db.availabilitySlot.deleteMany({ where: { tutorId } }),
    db.availabilitySlot.createMany({ data: [...unique.values()].map((s) => ({ tutorId, ...s })) }),
    db.availabilityException.deleteMany({ where: { tutorId } }),
    db.availabilityException.createMany({ data: [...new Set(input.exceptions)].map((date) => ({ tutorId, date })) }),
  ]);
}

/** Concrete slots of one week (0 = current week) as a student sees them. */
export async function getWeekSlots(db: Db, tutorId: string, weekOffset: number, now = new Date()) {
  if (!Number.isInteger(weekOffset) || weekOffset < 0 || weekOffset >= BOOKING_WINDOW_WEEKS) {
    throw new DomainError("VALIDATION", "Semana fuera del rango de reserva.");
  }
  const t = await loadTutor(db, tutorId);
  const weekStart = addDays(mondayOf(localDateOf(now, t.timezone)), weekOffset * 7);
  // Padded by a day on each side so timezone offsets never drop an overlapping session.
  const busy = await db.booking.findMany({
    where: {
      tutorId,
      status: "ACCEPTED",
      startAt: { lt: new Date(`${addDays(weekStart, 8)}T00:00:00Z`) },
      endAt: { gt: new Date(`${addDays(weekStart, -1)}T00:00:00Z`) },
    },
    select: { startAt: true, endAt: true },
  });
  const slots = buildWeekSlots({
    weekStart,
    slots: t.availability,
    exceptions: t.exceptions.map((e) => e.date),
    slotMinutes: t.slotMinutes,
    timeZone: t.timezone,
    busy,
    now,
  });
  return { weekStart, timezone: t.timezone, slotMinutes: t.slotMinutes, slots };
}
