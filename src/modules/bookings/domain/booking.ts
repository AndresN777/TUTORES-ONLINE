import { z } from "zod";
import type { BookingStatus, Role } from "@prisma/client";
import { DomainError } from "@/lib/utils/errors";

export type BookingAction = "accept" | "reject" | "cancel" | "complete";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Declinada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

type BookingFacts = { status: BookingStatus; startAt: Date; studentId: string; tutorId: string };
type Actor = { id: string; role: Role };

/**
 * The single source of truth for booking state changes.
 * Policy (documented in docs/business-rules.md):
 *  - Only the tutor accepts or rejects, and only while PENDING and before the start time.
 *  - Student or tutor may cancel a PENDING/ACCEPTED booking any time before it starts.
 *  - Only the tutor marks an ACCEPTED booking as COMPLETED, once its start time has passed.
 */
export function nextStatus(booking: BookingFacts, action: BookingAction, actor: Actor, now: Date): BookingStatus {
  const isTutor = actor.role === "TUTOR" && actor.id === booking.tutorId;
  const isStudent = actor.role === "STUDENT" && actor.id === booking.studentId;
  const started = booking.startAt <= now;

  switch (action) {
    case "accept":
    case "reject":
      if (!isTutor) throw forbidden();
      if (booking.status !== "PENDING") throw invalid("Esta solicitud ya fue respondida.");
      if (started) throw invalid("La fecha de esta solicitud ya pasó.");
      return action === "accept" ? "ACCEPTED" : "REJECTED";
    case "cancel":
      if (!isTutor && !isStudent) throw forbidden();
      if (booking.status !== "PENDING" && booking.status !== "ACCEPTED") throw invalid("Esta tutoría ya no se puede cancelar.");
      if (started) throw invalid("No se puede cancelar una tutoría que ya comenzó.");
      return "CANCELLED";
    case "complete":
      if (!isTutor) throw forbidden();
      if (booking.status !== "ACCEPTED") throw invalid("Solo se pueden completar tutorías aceptadas.");
      if (!started) throw invalid("La tutoría aún no ha ocurrido.");
      return "COMPLETED";
  }
}

const forbidden = () => new DomainError("FORBIDDEN", "No tienes permiso sobre esta tutoría.");
const invalid = (message: string) => new DomainError("CONFLICT", message);

export const meetingUrlSchema = z
  .string()
  .trim()
  .max(500, "El enlace es demasiado largo.")
  .url("Agrega un enlace de reunión válido que empiece con https://.")
  .refine((v) => v.startsWith("https://"), "Agrega un enlace de reunión válido que empiece con https://.");

export const meetingPlaceSchema = z
  .string()
  .trim()
  .min(3, "Indica el punto de encuentro para la tutoría presencial.")
  .max(120, "El punto de encuentro es demasiado largo.");

export const createBookingSchema = z.object({
  tutorId: z.string().min(1),
  subjectId: z.string().min(1, "Elige una materia."),
  modality: z.enum(["VIRTUAL", "IN_PERSON"], { errorMap: () => ({ message: "Elige una modalidad." }) }),
  startAt: z.coerce.date({ errorMap: () => ({ message: "Elige un horario disponible." }) }),
  note: z.string().trim().max(300, "El mensaje admite hasta 300 caracteres.").optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
