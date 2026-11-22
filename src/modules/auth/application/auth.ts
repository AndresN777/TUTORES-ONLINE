import type { PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";
import type { EmailProvider } from "@/modules/notifications/infrastructure/email";
import type { RegisterInput } from "../domain/schemas";
import { getDummyHash, hashPassword, verifyPassword } from "../infrastructure/password";
import { generateToken, hashToken } from "../infrastructure/tokens";

const RESET_TTL_MS = 30 * 60 * 1000;
const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";

export async function registerUser(db: Db, input: RegisterInput) {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    // Registration must reveal that the email is taken to be usable; the rate
    // limit in the action layer keeps this from being used for bulk enumeration.
    throw new DomainError("CONFLICT", "No pudimos crear la cuenta con ese correo. Si ya tienes una, inicia sesión o recupera tu contraseña.");
  }
  const passwordHash = await hashPassword(input.password);
  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      age: input.age,
      sex: input.sex,
      // Tutors start unverified: an admin must approve them before they appear in search.
      tutorProfile: input.role === "TUTOR" ? { create: {} } : undefined,
    },
    select: { id: true, role: true },
  });
}

export async function authenticate(db: Db, email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true, passwordHash: true },
  });
  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    throw new DomainError("UNAUTHENTICATED", INVALID_CREDENTIALS);
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new DomainError("UNAUTHENTICATED", INVALID_CREDENTIALS);
  }
  if (user.status !== "ACTIVE") {
    throw new DomainError("FORBIDDEN", "Tu cuenta está suspendida. Escribe al equipo de soporte.");
  }
  return { id: user.id, role: user.role };
}

/** Always resolves the same way whether or not the email exists (no enumeration). */
export async function requestPasswordReset(db: Db, email: string, mailer: EmailProvider, appUrl: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, status: true } });
  if (!user || user.status !== "ACTIVE") return;
  const token = generateToken();
  await db.passwordResetToken.create({
    data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await mailer.send({
    to: user.email,
    subject: "Restablece tu contraseña de TutoresOn-Line",
    text: `Usa este enlace en los próximos 30 minutos para elegir una nueva contraseña:\n${link}\n\nSi no lo pediste, ignora este mensaje.`,
  });
  if (!result.delivered) console.info(`[auth] reset email not delivered by provider "${result.provider}"`);
}

export async function resetPassword(db: PrismaClient, token: string, newPassword: string): Promise<void> {
  const record = await db.passwordResetToken.findUnique({ where: { id: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new DomainError("VALIDATION", "El enlace no es válido o expiró. Solicita uno nuevo.");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Changing the password signs the user out everywhere.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
}
