import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { NextSessionCard } from "@/components/shared/NextSessionCard";
import { listBookingsFor, nextAcceptedBooking } from "@/modules/bookings/application/bookings";
import { StudentRequests } from "@/modules/bookings/presentation/StudentRequests";
import { toBookingView } from "@/modules/bookings/presentation/view";
import { suggestedTutors } from "@/modules/tutors/application/tutors";
import { TutorCardView } from "@/modules/tutors/presentation/TutorCardView";

export const metadata: Metadata = { title: "Inicio" };

export default async function StudentHome() {
  const user = await requireRolePage("STUDENT");
  const now = new Date();
  const [next, all, suggested] = await Promise.all([
    nextAcceptedBooking(prisma, user, now),
    listBookingsFor(prisma, user),
    suggestedTutors(prisma, user.id),
  ]);
  // Requests that still matter: pending ones and upcoming declines.
  const requests = all
    .filter((b) => b.status === "PENDING" || (b.status === "REJECTED" && b.startAt > now))
    .map((b) => toBookingView(b, "STUDENT", user.timezone, now));

  return (
    <>
      <PageHeader title="Inicio" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
        <div className="flex flex-col gap-9">
          <NextSessionCard
            booking={next ? toBookingView(next, "STUDENT", user.timezone, now) : null}
            href="/student/bookings"
            linkLabel="Ver detalles y enlace de la reunión"
            empty={<>No tienes tutorías confirmadas. <Link href="/student/search" className="text-accent-text underline">Busca un tutor</Link> y envía una solicitud.</>}
          />
          {suggested.length > 0 && (
            <section aria-labelledby="sug-h" className="flex flex-col gap-2.5">
              <h2 id="sug-h" className="section-title">Podría interesarte</h2>
              <div className="grid grid-cols-2 gap-4">
                {suggested.map((t) => <TutorCardView key={t.id} tutor={t} compact />)}
              </div>
            </section>
          )}
        </div>
        <StudentRequests requests={requests} />
      </div>
    </>
  );
}
