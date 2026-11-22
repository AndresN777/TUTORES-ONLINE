"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/utils/errors";
import { fieldErrors } from "@/modules/auth/domain/schemas";
import { acceptBooking, cancelBooking, completeBooking, createBooking, rejectBooking, updateMeetingDetails } from "../application/bookings";
import { createBookingSchema } from "../domain/booking";

const refresh = () => {
  revalidatePath("/student", "layout");
  revalidatePath("/tutor", "layout");
};

export async function createBookingAction(input: unknown): Promise<ActionResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos de la solicitud.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const student = await requireUser("STUDENT");
    await createBooking(prisma, student, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function acceptBookingAction(bookingId: string, details: { meetingUrl?: string; meetingPlace?: string }): Promise<ActionResult> {
  try {
    const tutor = await requireUser("TUTOR");
    await acceptBooking(prisma, tutor, String(bookingId), { meetingUrl: details?.meetingUrl, meetingPlace: details?.meetingPlace });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function rejectBookingAction(bookingId: string): Promise<ActionResult> {
  try {
    const tutor = await requireUser("TUTOR");
    await rejectBooking(prisma, tutor, String(bookingId));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  try {
    const user = await requireUser("STUDENT", "TUTOR");
    await cancelBooking(prisma, user, String(bookingId));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function completeBookingAction(bookingId: string): Promise<ActionResult> {
  try {
    const tutor = await requireUser("TUTOR");
    await completeBooking(prisma, tutor, String(bookingId));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function updateMeetingAction(bookingId: string, details: { meetingUrl?: string; meetingPlace?: string }): Promise<ActionResult> {
  try {
    const tutor = await requireUser("TUTOR");
    await updateMeetingDetails(prisma, tutor, String(bookingId), { meetingUrl: details?.meetingUrl, meetingPlace: details?.meetingPlace });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
