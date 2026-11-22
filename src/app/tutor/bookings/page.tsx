import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { listBookingsFor } from "@/modules/bookings/application/bookings";
import { BookingList } from "@/modules/bookings/presentation/BookingList";
import { toBookingView } from "@/modules/bookings/presentation/view";

export const metadata: Metadata = { title: "Mis tutorías" };

export default async function TutorBookingsPage() {
  const user = await requireRolePage("TUTOR");
  const now = new Date();
  // Pending requests are answered from Inicio; this page manages confirmed sessions.
  const bookings = (await listBookingsFor(prisma, user)).filter((b) => b.status !== "PENDING").map((b) => toBookingView(b, "TUTOR", user.timezone, now));
  const ids = (pred: (b: (typeof bookings)[number]) => boolean) => bookings.filter(pred).map((b) => b.id);
  return (
    <>
      <PageHeader title="Mis tutorías" />
      <BookingList
        viewer="TUTOR"
        bookings={bookings}
        emptyAction={{ href: "/tutor", label: "Revisar solicitudes pendientes" }}
        tabs={[
          { key: "upcoming", label: "Próximas", ids: ids((b) => b.status === "ACCEPTED" && !b.isPast), empty: "No tienes tutorías próximas." },
          { key: "toClose", label: "Por cerrar", ids: ids((b) => b.status === "ACCEPTED" && b.isPast), empty: "No hay tutorías pendientes de cerrar." },
          { key: "history", label: "Historial", ids: ids((b) => b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "REJECTED"), empty: "Tu historial está vacío." },
        ]}
      />
    </>
  );
}
