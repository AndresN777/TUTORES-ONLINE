import type { BookingStatus } from "@prisma/client";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/domain/booking";

const TONE: Record<BookingStatus, string> = {
  PENDING: "bg-[#FFF4E0] text-[#8A4B00]",
  ACCEPTED: "bg-[#E3F5EC] text-[#0B6B45]",
  COMPLETED: "bg-[#EAF3FF] text-[#0056B3]",
  CANCELLED: "bg-[#F1F2F4] text-ink-soft",
  REJECTED: "bg-[#FDECEA] text-danger",
};

export function StatusChip({ status, extra }: { status: BookingStatus; extra?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[13px] ${TONE[status]}`}>
      {BOOKING_STATUS_LABEL[status]}
      {extra ? ` · ${extra}` : ""}
    </span>
  );
}
