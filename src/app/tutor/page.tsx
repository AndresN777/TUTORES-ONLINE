import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { NextSessionCard } from "@/components/shared/NextSessionCard";
import { listBookingsFor, nextAcceptedBooking } from "@/modules/bookings/application/bookings";
import { TutorRequests } from "@/modules/bookings/presentation/TutorRequests";
import { toBookingView } from "@/modules/bookings/presentation/view";
import { getOwnTutorProfile } from "@/modules/tutors/application/tutors";

export const metadata: Metadata = { title: "Inicio" };

export default async function TutorHome() {
  const user = await requireRolePage("TUTOR");
  const now = new Date();
  const [next, all, profile] = await Promise.all([nextAcceptedBooking(prisma, user, now), listBookingsFor(prisma, user), getOwnTutorProfile(prisma, user.id)]);
  const pending = all.filter((b) => b.status === "PENDING" && b.startAt > now).map((b) => toBookingView(b, "TUTOR", user.timezone, now));

  return (
    <>
      <PageHeader title="Inicio" />
      {profile.verification !== "APPROVED" && (
        <p role="status" className="m-0 border-2 border-accent bg-accent-tint px-4 py-3">
          {profile.verification === "PENDING"
            ? "Tu perfil está en revisión: aún no apareces en la búsqueda de estudiantes. "
            : "Tu perfil no fue aprobado. Corrige tu descripción y materias para enviarlo de nuevo a revisión. "}
          <Link href="/tutor/profile" className="text-accent-text underline">Completar perfil</Link>
        </p>
      )}
      <TutorRequests requests={pending}>
        <NextSessionCard
          booking={next ? toBookingView(next, "TUTOR", user.timezone, now) : null}
          href="/tutor/bookings"
          linkLabel="Ver detalles de la tutoría"
          empty={<>No tienes tutorías confirmadas. <Link href="/tutor/availability" className="text-accent-text underline">Revisa tu disponibilidad</Link>.</>}
        />
      </TutorRequests>
    </>
  );
}
