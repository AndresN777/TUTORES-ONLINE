import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { listBookingsFor } from "@/modules/bookings/application/bookings";
import { BookingList } from "@/modules/bookings/presentation/BookingList";
import { toBookingView } from "@/modules/bookings/presentation/view";

export const metadata: Metadata = { title: "Mis tutorías" };

export default async function StudentBookingsPage() {
  const user = await requireRolePage("STUDENT");
  const now = new Date();
  const bookings = (await listBookingsFor(prisma, user)).map((b) => toBookingView(b, "STUDENT", user.timezone, now));
  const ids = (pred: (b: (typeof bookings)[number]) => boolean) => bookings.filter(pred).map((b) => b.id);
  return (
    <>
      <PageHeader title="Mis tutorías" />
      <BookingList
        viewer="STUDENT"
        bookings={bookings}
        emptyAction={{ href: "/student/search", label: "Buscar tutores" }}
        tabs={[
          { key: "upcoming", label: "Próximas", ids: ids((b) => b.status === "ACCEPTED" && !b.isPast), empty: "No tienes tutorías confirmadas próximamente." },
          { key: "pending", label: "Pendientes", ids: ids((b) => b.status === "PENDING"), empty: "No tienes solicitudes pendientes." },
          { key: "history", label: "Historial", ids: ids((b) => b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "REJECTED" || (b.status === "ACCEPTED" && b.isPast)), empty: "Aún no tienes tutorías en tu historial." },
        ]}
      />
    </>
  );
}
