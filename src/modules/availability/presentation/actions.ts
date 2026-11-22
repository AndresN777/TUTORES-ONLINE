"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { saveAvailability } from "../application/availability";
import { availabilitySchema } from "../domain/slots";

export async function saveAvailabilityAction(input: unknown): Promise<ActionResult> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const tutor = await requireUser("TUTOR");
    await saveAvailability(prisma, tutor.id, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/tutor", "layout");
  return { ok: true };
}
