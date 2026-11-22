import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { DomainError } from "@/lib/utils/errors";
import { SUPPORTED_TIMEZONES, WEEKDAY_LABELS, displayLocalDate, formatDate, formatTime, localDateOf, weekdayOf } from "@/lib/utils/time";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { getWeekSlots } from "@/modules/availability/application/availability";
import { BOOKING_WINDOW_WEEKS } from "@/modules/availability/domain/slots";
import { BookingForm, type SlotDay } from "@/modules/bookings/presentation/BookingForm";
import { listTutorReviews } from "@/modules/reviews/application/reviews";
import { stars } from "@/modules/reviews/domain/review";
import { getPublicTutor } from "@/modules/tutors/application/tutors";
import { modalityLabel } from "@/modules/tutors/presentation/TutorCardView";
import { ReviewList } from "@/modules/reviews/presentation/ReviewList";

export const metadata: Metadata = { title: "Perfil del tutor" };

export default async function TutorProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string }> }) {
  const user = await requireRolePage("STUDENT");
  const { id } = await params;
  const week = Math.min(Math.max(Number.parseInt((await searchParams).week ?? "0", 10) || 0, 0), BOOKING_WINDOW_WEEKS - 1);

  let tutor;
  try {
    tutor = await getPublicTutor(prisma, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const [weekData, reviews] = await Promise.all([getWeekSlots(prisma, id, week), listTutorReviews(prisma, id)]);

  // Slots are shown in the student's timezone.
  const tz = user.timezone;
  const byDay = new Map<string, SlotDay>();
  for (const s of weekData.slots) {
    const label = `${WEEKDAY_LABELS[weekdayOf(localDateOf(s.startAt, tz))]} ${formatDate(s.startAt, tz).slice(0, 5)}`;
    const day = byDay.get(label) ?? { label, slots: [] };
    const time = formatTime(s.startAt, tz);
    day.slots.push({ startIso: s.startAt.toISOString(), time, available: s.available, aria: `${label}, ${time}${s.available ? "" : ", no disponible"}` });
    byDay.set(label, day);
  }
  const tzLabel = SUPPORTED_TIMEZONES.find((t) => t.id === tz)?.label ?? tz;

  return (
    <>
      <PageHeader title="Perfil del tutor" />
      <Link href="/student/search" className="self-start text-base text-accent-text underline">← Volver a la búsqueda</Link>
      <div className="flex flex-wrap items-start gap-8">
        <section aria-labelledby="tutor-h" className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
          <div className="flex items-center gap-5">
            <Avatar userId={tutor.id} avatarFile={tutor.avatarFile} size={112} />
            <div className="flex flex-col gap-1">
              <h2 id="tutor-h" className="m-0 text-[34px] font-normal text-accent uppercase">{tutor.name}</h2>
              <span className="text-lg">
                {tutor.rating.average !== null ? `★ ${tutor.rating.average.toFixed(1)} · ${tutor.rating.count} reseñas` : "Sin reseñas aún"} · {tutor.completed} tutorías completadas
              </span>
              <span className="text-[15px] text-muted">{modalityLabel(tutor)}{tutor.offersInPerson && tutor.zone ? ` · Zona ${tutor.zone}` : ""}</span>
            </div>
          </div>
          <p className="m-0 text-[17px] leading-relaxed font-light whitespace-pre-line">{tutor.bio}</p>
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-5 gap-y-2">
            <dt className="text-muted">Materias</dt><dd className="m-0">{tutor.subjects.map((s) => s.name).join(", ")}</dd>
            <dt className="text-muted">Niveles</dt><dd className="m-0">{tutor.levels.join(", ") || "—"}</dd>
            <dt className="text-muted">Duración</dt><dd className="m-0">{tutor.slotMinutes} minutos por tutoría</dd>
          </dl>
          <section aria-labelledby="rev-h" className="flex flex-col gap-3">
            <h3 id="rev-h" className="section-title">Reseñas de estudiantes</h3>
            {reviews.length === 0 ? (
              <p className="m-0 text-ink-soft">Este profesor aún no tiene reseñas.</p>
            ) : (
              <ReviewList
                reviews={reviews.map((r) => ({
                  id: r.id,
                  stars: stars(r.rating),
                  rating: r.rating,
                  author: `${r.student.firstName} ${r.student.lastName.charAt(0)}.`,
                  date: formatDate(r.createdAt, tz),
                  text: r.comment,
                }))}
              />
            )}
          </section>
        </section>

        <section aria-labelledby="book-h" className="flex min-w-0 flex-[1_1_420px] flex-col gap-4.5 border-4 border-accent p-5">
          <h2 id="book-h" className="m-0 font-display text-[40px] leading-none font-semibold text-accent">SOLICITAR TUTORÍA</h2>
          <BookingForm
            key={week}
            tutorId={tutor.id}
            tutorName={tutor.name}
            subjects={tutor.subjects.map((s) => ({ id: s.id, name: s.name }))}
            offersVirtual={tutor.offersVirtual}
            offersInPerson={tutor.offersInPerson}
            zone={tutor.zone}
            days={[...byDay.values()]}
            weekLabel={displayLocalDate(weekData.weekStart)}
            prevHref={week > 0 ? `/student/tutors/${id}?week=${week - 1}` : null}
            nextHref={week < BOOKING_WINDOW_WEEKS - 1 ? `/student/tutors/${id}?week=${week + 1}` : null}
            timezoneLabel={tzLabel}
          />
        </section>
      </div>
    </>
  );
}
