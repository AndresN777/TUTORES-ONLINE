"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { markAllNotificationsRead, markNotificationRead } from "../application/notifications";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationRead(prisma, user.id, id);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markAllNotificationsRead(prisma, user.id);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
