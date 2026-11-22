"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { createReview, moderateReview, reportReview } from "../application/reviews";
import { reportSchema, reviewSchema } from "../domain/review";

export async function createReviewAction(bookingId: string, input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const student = await requireUser("STUDENT");
    await createReview(prisma, student, String(bookingId), parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/student/bookings");
  return { ok: true };
}

export async function reportReviewAction(reviewId: string, input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const tutor = await requireUser("TUTOR");
    await reportReview(prisma, tutor, String(reviewId), parsed.data.reason);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/tutor/profile");
  return { ok: true, message: "Reporte enviado. Un administrador lo revisará." };
}

const moderation = z.enum(["hide", "restore", "dismiss"]);

export async function moderateReviewAction(reviewId: string, action: unknown): Promise<ActionResult> {
  const parsed = moderation.safeParse(action);
  if (!parsed.success) return { ok: false, error: "Acción no válida." };
  try {
    const admin = await requireUser("ADMIN");
    await moderateReview(prisma, admin, String(reviewId), parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/admin/reviews");
  return { ok: true };
}
