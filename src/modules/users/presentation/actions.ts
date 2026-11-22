"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { fieldErrors } from "@/modules/auth/domain/schemas";
import { decideVerification } from "@/modules/tutors/application/tutors";
import { setUserStatus, updateAvatar, updateProfile } from "../application/users";
import { profileSchema } from "../domain/profile";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = await requireUser("STUDENT", "TUTOR");
    await updateProfile(prisma, user.id, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAvatarAction(form: FormData): Promise<ActionResult> {
  const file = form.get("avatar");
  if (!(file instanceof File)) return { ok: false, error: "Elige una imagen." };
  try {
    const user = await requireUser();
    await updateAvatar(prisma, user.id, new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const statusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

export async function setUserStatusAction(userId: string, status: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Estado no válido." };
  try {
    const admin = await requireUser("ADMIN");
    await setUserStatus(prisma, admin, String(userId), parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function decideVerificationAction(tutorId: string, approve: boolean): Promise<ActionResult> {
  try {
    const admin = await requireUser("ADMIN");
    await decideVerification(prisma, admin, String(tutorId), approve === true);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/admin");
  return { ok: true };
}
