import type { BookingStatus, Modality } from "@prisma/client";
import { formatDate, formatTime } from "@/lib/utils/time";
import type { BookingListItem } from "../application/bookings";

/** Serializable booking row for client components, formatted in the viewer's timezone. */
export type BookingView = {
  id: string;
  status: BookingStatus;
  modality: Modality;
  startIso: string;
  date: string;
  time: string;
  subject: { name: string; slug: string };
  counterpart: { id: string; firstName: string; lastName: string; avatarFile: string | null };
  note: string | null;
  meetingUrl: string | null;
  meetingPlace: string | null;
  isPast: boolean;
  review: { rating: number; comment: string | null } | null;
};

export function toBookingView(b: BookingListItem, viewer: "STUDENT" | "TUTOR", timeZone: string, now = new Date()): BookingView {
  const other = viewer === "STUDENT" ? b.tutor : b.student;
  return {
    id: b.id,
    status: b.status,
    modality: b.modality,
    startIso: b.startAt.toISOString(),
    date: formatDate(b.startAt, timeZone),
    time: formatTime(b.startAt, timeZone),
    subject: b.subject,
    counterpart: { id: other.id, firstName: other.firstName, lastName: other.lastName, avatarFile: other.avatarFile },
    note: b.studentNote,
    meetingUrl: b.meetingUrl,
    meetingPlace: b.meetingPlace,
    isPast: b.startAt <= now,
    // The author always sees their own review, even if moderation hid it from the public.
    review: b.review ? { rating: b.review.rating, comment: b.review.comment } : null,
  };
}
