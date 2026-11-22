import { PrismaClient } from "@prisma/client";
import { addDays, localDateOf, mondayOf, zonedToUtc } from "@/lib/utils/time";

export const db = new PrismaClient();
export const TZ = "America/Santo_Domingo";
// Cheap placeholder: these factories bypass password hashing; auth tests use real hashes.
const HASH = "not-a-real-hash";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function resetDb() {
  await db.$transaction([
    db.notification.deleteMany(),
    db.review.deleteMany(),
    db.booking.deleteMany(),
    db.availabilityException.deleteMany(),
    db.availabilitySlot.deleteMany(),
    db.tutorLevel.deleteMany(),
    db.tutorSubject.deleteMany(),
    db.tutorProfile.deleteMany(),
    db.session.deleteMany(),
    db.passwordResetToken.deleteMany(),
    db.user.deleteMany(),
    db.subject.deleteMany(),
    db.level.deleteMany(),
  ]);
}

export async function createSubject(name = "Física") {
  return db.subject.create({ data: { name: `${name}-${uid()}`, slug: `s-${uid()}` } });
}

export async function createStudent() {
  const user = await db.user.create({
    data: { email: `st-${uid()}@test.dev`, passwordHash: HASH, role: "STUDENT", firstName: "Est", lastName: "Udiante", age: 18, sex: "OTHER" },
  });
  return { ...user, actor: { id: user.id, role: "STUDENT" as const } };
}

export async function createAdmin() {
  const user = await db.user.create({
    data: { email: `ad-${uid()}@test.dev`, passwordHash: HASH, role: "ADMIN", firstName: "Ad", lastName: "Min", age: 30, sex: "OTHER" },
  });
  return { ...user, actor: { id: user.id, role: "ADMIN" as const } };
}

/** Approved tutor available Monday–Friday at 9:00 and 16:00 (local), teaching `subjectId`. */
export async function createTutor(subjectId: string, opts: { verification?: "APPROVED" | "PENDING"; inPerson?: boolean } = {}) {
  const user = await db.user.create({
    data: {
      email: `tu-${uid()}@test.dev`,
      passwordHash: HASH,
      role: "TUTOR",
      firstName: "Pro",
      lastName: "Fesor",
      age: 40,
      sex: "OTHER",
      timezone: TZ,
      tutorProfile: {
        create: {
          bio: "Profesor con experiencia suficiente para pasar la validación.",
          verification: opts.verification ?? "APPROVED",
          offersVirtual: true,
          offersInPerson: opts.inPerson ?? false,
          zone: opts.inPerson ? "Centro" : null,
          subjects: { create: [{ subjectId }] },
          availability: { create: [0, 1, 2, 3, 4].flatMap((weekday) => [{ weekday, startMinute: 540 }, { weekday, startMinute: 960 }]) },
        },
      },
    },
  });
  return { ...user, actor: { id: user.id, role: "TUTOR" as const } };
}

/** Fixed "now": Wednesday 2026-11-18 12:00 in Santo Domingo. */
export const NOW = zonedToUtc("2026-11-18", 12 * 60, TZ);

/** Start of a tutor slot `weeks` weeks after NOW's week, on `weekday` (0 = Monday) at `minute`. */
export function slotAt(weeks: number, weekday: number, minute: number): Date {
  return zonedToUtc(addDays(mondayOf(localDateOf(NOW, TZ)), weeks * 7 + weekday), minute, TZ);
}
