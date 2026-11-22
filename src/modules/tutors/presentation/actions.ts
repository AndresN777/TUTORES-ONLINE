"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { fieldErrors } from "@/modules/auth/domain/schemas";
import { updateTutorProfile } from "../application/tutors";
import { tutorProfileSchema } from "../domain/tutor";

export async function updateTutorProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = tutorProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const tutor = await requireUser("TUTOR");
    await updateTutorProfile(prisma, tutor.id, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/tutor/profile");
  return { ok: true };
}
