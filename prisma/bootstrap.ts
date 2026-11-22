/**
 * Production-safe initial setup. Idempotent: running it again changes nothing.
 *  - Creates the base catalog (levels and subjects) only if missing; never reactivates
 *    or renames entries an admin already edited.
 *  - Creates the first ADMIN account from ADMIN_EMAIL / ADMIN_PASSWORD if that email
 *    does not exist yet. An existing account is left untouched (its password is not reset).
 *
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:bootstrap
 */
import { PrismaClient } from "@prisma/client";
import { emailSchema, passwordSchema } from "../src/modules/auth/domain/schemas";
import { hashPassword } from "../src/modules/auth/infrastructure/password";

const LEVELS = ["Primaria", "Secundaria", "Universidad"];
const SUBJECTS = [
  ["matematicas", "Matemáticas"],
  ["quimica", "Química"],
  ["fisica", "Física"],
  ["ingles", "Inglés"],
  ["lenguaje", "Lenguaje"],
  ["biologia", "Biología"],
] as const;

const prisma = new PrismaClient();

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? "");
  if (!email.success || !password.success) {
    throw new Error("Define ADMIN_EMAIL (correo válido) y ADMIN_PASSWORD (mínimo 8 caracteres con letras y números).");
  }

  for (const [position, name] of LEVELS.entries()) {
    await prisma.level.upsert({ where: { name }, update: {}, create: { name, position } });
  }
  for (const [slug, name] of SUBJECTS) {
    await prisma.subject.upsert({ where: { slug }, update: {}, create: { slug, name } });
  }
  console.info(`Catálogo listo: ${await prisma.level.count()} niveles, ${await prisma.subject.count()} materias.`);

  const existing = await prisma.user.findUnique({ where: { email: email.data }, select: { role: true } });
  if (existing) {
    console.info(`La cuenta ${email.data} ya existe (rol ${existing.role}); no se modificó.`);
    return;
  }
  await prisma.user.create({
    data: {
      email: email.data,
      passwordHash: await hashPassword(password.data),
      role: "ADMIN",
      firstName: "Equipo",
      lastName: "TutoresOn-Line",
      age: 30,
      sex: "UNDISCLOSED",
    },
  });
  console.info(`Administrador ${email.data} creado.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
