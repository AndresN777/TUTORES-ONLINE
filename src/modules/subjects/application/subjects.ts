import { z } from "zod";
import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";

export const subjectNameSchema = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres.")
  .max(40, "El nombre admite hasta 40 caracteres.");

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function listActiveSubjects(db: Db) {
  return db.subject.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } });
}

export function listActiveLevels(db: Db) {
  return db.level.findMany({ where: { active: true }, orderBy: { position: "asc" }, select: { id: true, name: true } });
}

export function listCatalog(db: Db) {
  return Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, active: true, _count: { select: { tutors: true } } } }),
    db.level.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true, active: true } }),
  ]);
}

export async function createSubject(db: Db, name: string) {
  const slug = slugify(name);
  if (!slug) throw new DomainError("VALIDATION", "El nombre debe tener letras o números.");
  const existing = await db.subject.findFirst({ where: { OR: [{ slug }, { name }] }, select: { id: true } });
  if (existing) throw new DomainError("CONFLICT", "Esa materia ya existe en el catálogo.");
  return db.subject.create({ data: { name, slug } });
}

/** Deactivating hides it from filters and new profiles; history is kept intact. */
export async function setSubjectActive(db: Db, id: string, active: boolean) {
  const subject = await db.subject.findUnique({ where: { id }, select: { id: true } });
  if (!subject) throw new DomainError("NOT_FOUND", "La materia no existe.");
  return db.subject.update({ where: { id }, data: { active } });
}

export async function setLevelActive(db: Db, id: string, active: boolean) {
  const level = await db.level.findUnique({ where: { id }, select: { id: true } });
  if (!level) throw new DomainError("NOT_FOUND", "El nivel no existe.");
  return db.level.update({ where: { id }, data: { active } });
}
