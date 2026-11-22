"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { createSubject, setLevelActive, setSubjectActive, subjectNameSchema } from "../application/subjects";

export async function createSubjectAction(name: unknown): Promise<ActionResult> {
  const parsed = subjectNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await requireUser("ADMIN");
    await createSubject(prisma, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/admin/subjects");
  return { ok: true, message: `${parsed.data} agregada al catálogo.` };
}

export async function setCatalogActiveAction(kind: "subject" | "level", id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireUser("ADMIN");
    if (kind === "subject") await setSubjectActive(prisma, String(id), active === true);
    else if (kind === "level") await setLevelActive(prisma, String(id), active === true);
    else return { ok: false, error: "Tipo no válido." };
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/admin/subjects");
  return { ok: true };
}
