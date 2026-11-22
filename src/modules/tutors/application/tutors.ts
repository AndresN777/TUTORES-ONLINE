import type { PrismaClient, Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";
import { notify } from "@/modules/notifications/application/notifications";
import { ratingsFor } from "@/modules/reviews/application/reviews";
import type { RatingSummary } from "@/modules/reviews/domain/review";
import { SEARCH_PAGE_SIZE, type SearchFilters, type TutorProfileInput } from "../domain/tutor";

const cardSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarFile: true,
  tutorProfile: {
    select: {
      offersVirtual: true,
      offersInPerson: true,
      zone: true,
      subjects: { select: { subject: { select: { id: true, slug: true, name: true, active: true } } } },
      levels: { select: { level: { select: { id: true, name: true, position: true } } } },
      availability: { select: { weekday: true } },
    },
  },
} satisfies Prisma.UserSelect;

export type TutorCard = {
  id: string;
  name: string;
  avatarFile: string | null;
  subjects: { id: string; slug: string; name: string }[];
  levels: string[];
  offersVirtual: boolean;
  offersInPerson: boolean;
  zone: string | null;
  rating: RatingSummary;
};

/** Only approved tutors with active accounts are ever visible to students. */
const visibleTutor = { role: "TUTOR", status: "ACTIVE", tutorProfile: { verification: "APPROVED" } } satisfies Prisma.UserWhereInput;

function toCard(u: Prisma.UserGetPayload<{ select: typeof cardSelect }>, rating: RatingSummary): TutorCard {
  const p = u.tutorProfile!;
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    avatarFile: u.avatarFile,
    subjects: p.subjects.map((s) => s.subject).filter((s) => s.active),
    levels: p.levels.map((l) => l.level).sort((a, b) => a.position - b.position).map((l) => l.name),
    offersVirtual: p.offersVirtual,
    offersInPerson: p.offersInPerson,
    zone: p.zone,
    rating,
  };
}

export async function searchTutors(db: Db, f: SearchFilters) {
  const where: Prisma.UserWhereInput = { ...visibleTutor };
  const and: Prisma.UserWhereInput[] = [];
  if (f.q) and.push({ OR: [{ firstName: { contains: f.q } }, { lastName: { contains: f.q } }] });
  if (f.subjects.length) and.push({ tutorProfile: { subjects: { some: { subject: { slug: { in: f.subjects }, active: true } } } } });
  if (f.modality === "VIRTUAL") and.push({ tutorProfile: { offersVirtual: true } });
  if (f.modality === "IN_PERSON") and.push({ tutorProfile: { offersInPerson: true, ...(f.zone ? { zone: f.zone } : {}) } });
  if (f.level) and.push({ tutorProfile: { levels: { some: { level: { name: f.level } } } } });
  if (f.weekday !== undefined) and.push({ tutorProfile: { availability: { some: { weekday: f.weekday } } } });
  if (and.length) where.AND = and;

  const users = await db.user.findMany({ where, select: cardSelect, orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }] });
  const ratings = await ratingsFor(db, users.map((u) => u.id));
  // Ratings are derived, so the minimum-rating filter and sort run after aggregation.
  // Fine for the academic data volume; a larger catalog would need a materialized rating.
  let cards = users.map((u) => toCard(u, ratings.get(u.id)!)).filter((c) => (c.rating.average ?? 0) >= f.minRating);
  if (f.sort === "rating") {
    cards = cards.sort((a, b) => (b.rating.average ?? 0) - (a.rating.average ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }
  const total = cards.length;
  const pageCount = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  return { total, page, pageCount, items: cards.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE) };
}

export async function getPublicTutor(db: Db, tutorId: string) {
  const user = await db.user.findFirst({
    where: { id: tutorId, ...visibleTutor },
    select: { ...cardSelect, timezone: true, tutorProfile: { select: { ...cardSelect.tutorProfile.select, bio: true, slotMinutes: true } } },
  });
  if (!user) throw new DomainError("NOT_FOUND", "Este profesor no existe o no está disponible.");
  const rating = (await ratingsFor(db, [user.id])).get(user.id)!;
  const completed = await db.booking.count({ where: { tutorId, status: "COMPLETED" } });
  return { ...toCard(user, rating), bio: user.tutorProfile!.bio, slotMinutes: user.tutorProfile!.slotMinutes, timezone: user.timezone, completed };
}

/** Top-rated tutors, preferring subjects the student already studies. */
export async function suggestedTutors(db: Db, studentId: string, take = 2): Promise<TutorCard[]> {
  const history = await db.booking.findMany({ where: { studentId }, select: { subjectId: true, tutorId: true } });
  const subjectIds = [...new Set(history.map((h) => h.subjectId))];
  const seen = new Set(history.map((h) => h.tutorId));
  const users = await db.user.findMany({ where: visibleTutor, select: cardSelect });
  const ratings = await ratingsFor(db, users.map((u) => u.id));
  const score = (c: TutorCard) => (c.subjects.some((s) => subjectIds.includes(s.id)) ? 10 : 0) + (c.rating.average ?? 0) - (seen.has(c.id) ? 20 : 0);
  return users
    .map((u) => toCard(u, ratings.get(u.id)!))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
    .slice(0, take);
}

export async function getOwnTutorProfile(db: Db, tutorId: string) {
  const profile = await db.tutorProfile.findUnique({
    where: { userId: tutorId },
    select: {
      bio: true,
      verification: true,
      offersVirtual: true,
      offersInPerson: true,
      zone: true,
      subjects: { select: { subjectId: true } },
      levels: { select: { levelId: true } },
    },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de profesor no encontrado.");
  return {
    ...profile,
    subjectIds: profile.subjects.map((s) => s.subjectId),
    levelIds: profile.levels.map((l) => l.levelId),
  };
}

export async function updateTutorProfile(db: PrismaClient, tutorId: string, input: TutorProfileInput): Promise<void> {
  const [subjects, levels, current] = await Promise.all([
    db.subject.count({ where: { id: { in: input.subjectIds }, active: true } }),
    db.level.count({ where: { id: { in: input.levelIds }, active: true } }),
    db.tutorProfile.findUnique({ where: { userId: tutorId }, select: { verification: true } }),
  ]);
  if (!current) throw new DomainError("NOT_FOUND", "Perfil de profesor no encontrado.");
  if (subjects !== new Set(input.subjectIds).size) throw new DomainError("VALIDATION", "Alguna materia ya no está disponible.");
  if (levels !== new Set(input.levelIds).size) throw new DomainError("VALIDATION", "Algún nivel ya no está disponible.");
  await db.$transaction([
    db.tutorProfile.update({
      where: { userId: tutorId },
      data: {
        bio: input.bio,
        offersVirtual: input.offersVirtual,
        offersInPerson: input.offersInPerson,
        zone: input.offersInPerson ? input.zone : null,
        // A rejected profile goes back to the review queue once the tutor fixes it.
        verification: current.verification === "REJECTED" ? "PENDING" : current.verification,
      },
    }),
    db.tutorSubject.deleteMany({ where: { tutorId } }),
    db.tutorSubject.createMany({ data: [...new Set(input.subjectIds)].map((subjectId) => ({ tutorId, subjectId })) }),
    db.tutorLevel.deleteMany({ where: { tutorId } }),
    db.tutorLevel.createMany({ data: [...new Set(input.levelIds)].map((levelId) => ({ tutorId, levelId })) }),
  ]);
}

export function listVerificationQueue(db: Db) {
  return db.user.findMany({
    where: { role: "TUTOR", tutorProfile: { verification: "PENDING" } },
    orderBy: { createdAt: "asc" },
    select: { ...cardSelect, createdAt: true, tutorProfile: { select: { ...cardSelect.tutorProfile.select, bio: true } } },
  });
}

export async function decideVerification(db: Db, admin: { role: string }, tutorId: string, approve: boolean): Promise<void> {
  if (admin.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Solo un administrador puede verificar profesores.");
  const profile = await db.tutorProfile.findUnique({ where: { userId: tutorId }, select: { verification: true, bio: true, subjects: { select: { subjectId: true } } } });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de profesor no encontrado.");
  if (profile.verification !== "PENDING") throw new DomainError("CONFLICT", "Este perfil ya fue revisado.");
  if (approve && (profile.bio.length < 30 || profile.subjects.length === 0)) {
    throw new DomainError("CONFLICT", "El perfil está incompleto (descripción y materias): no se puede aprobar todavía.");
  }
  await db.tutorProfile.update({ where: { userId: tutorId }, data: { verification: approve ? "APPROVED" : "REJECTED" } });
  await notify(
    db,
    tutorId,
    approve
      ? "¡Tu perfil fue aprobado! Ya apareces en la búsqueda de tutores."
      : "Tu perfil no fue aprobado. Revisa tu descripción y materias, y guárdalo de nuevo para otra revisión.",
    "/tutor/profile",
  );
}
