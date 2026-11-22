import type { Prisma, PrismaClient, Role, UserStatus } from "@prisma/client";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";
import { hashPassword } from "@/modules/auth/infrastructure/password";
import { AVATAR_MAX_BYTES, detectImageType, type ProfileInput } from "../domain/profile";
import { deleteAvatar, saveAvatar } from "../infrastructure/avatar-storage";

export function getProfile(db: Db, userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true, sex: true, age: true, role: true, avatarFile: true },
  });
}

export async function updateProfile(db: PrismaClient, userId: string, input: ProfileInput): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!user) throw new DomainError("NOT_FOUND", "Usuario no encontrado.");
  if (user.role === "TUTOR" && input.age < 18) throw new DomainError("VALIDATION", "Los profesores deben ser mayores de edad.");
  if (input.email !== user.email) {
    const taken = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (taken) throw new DomainError("CONFLICT", "Ese correo no está disponible.");
  }
  const data: Prisma.UserUpdateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    sex: input.sex,
    age: input.age,
  };
  if (input.password) data.passwordHash = await hashPassword(input.password);
  await db.user.update({ where: { id: userId }, data });
}

export async function updateAvatar(db: Db, userId: string, bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0) throw new DomainError("VALIDATION", "Elige una imagen.");
  if (bytes.byteLength > AVATAR_MAX_BYTES) throw new DomainError("VALIDATION", "La imagen debe pesar menos de 2 MB.");
  const type = detectImageType(bytes);
  if (!type) throw new DomainError("VALIDATION", "Usa una imagen PNG, JPG o WebP.");
  const previous = await db.user.findUnique({ where: { id: userId }, select: { avatarFile: true } });
  const name = await saveAvatar(userId, bytes, type);
  await db.user.update({ where: { id: userId }, data: { avatarFile: name } });
  if (previous?.avatarFile) await deleteAvatar(previous.avatarFile);
  return name;
}

export type UserFilters = { q?: string; role?: Role; status?: UserStatus };

/** Admin listing. Never exposes password hashes or sessions. */
export function listUsers(db: Db, f: UserFilters) {
  const where: Prisma.UserWhereInput = { role: f.role ? f.role : { in: ["STUDENT", "TUTOR"] } };
  if (f.status) where.status = f.status;
  if (f.q) where.OR = [{ firstName: { contains: f.q } }, { lastName: { contains: f.q } }, { email: { contains: f.q.toLowerCase() } }];
  return db.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { firstName: "asc" }, { id: "asc" }],
    take: 200,
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true },
  });
}

export async function userStats(db: Db) {
  const [students, tutors, suspended, pending] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "TUTOR" } }),
    db.user.count({ where: { status: "SUSPENDED" } }),
    db.tutorProfile.count({ where: { verification: "PENDING" } }),
  ]);
  return { students, tutors, suspended, pending };
}

export async function setUserStatus(db: PrismaClient, admin: { id: string; role: Role }, userId: string, status: UserStatus): Promise<void> {
  if (admin.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Solo un administrador puede cambiar el estado de una cuenta.");
  if (admin.id === userId) throw new DomainError("VALIDATION", "No puedes cambiar el estado de tu propia cuenta.");
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new DomainError("NOT_FOUND", "Usuario no encontrado.");
  if (user.role === "ADMIN") throw new DomainError("FORBIDDEN", "Las cuentas de administración no se gestionan aquí.");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { status } }),
    // Suspension takes effect immediately: every open session is revoked.
    ...(status === "SUSPENDED" ? [db.session.deleteMany({ where: { userId } })] : []),
  ]);
}
