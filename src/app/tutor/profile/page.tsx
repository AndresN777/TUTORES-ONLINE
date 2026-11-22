import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/time";
import { PageHeader } from "@/components/shared/PageHeader";
import { listTutorReviews, ratingsFor } from "@/modules/reviews/application/reviews";
import { stars } from "@/modules/reviews/domain/review";
import { OwnReviews } from "@/modules/reviews/presentation/OwnReviews";
import { listActiveLevels, listActiveSubjects } from "@/modules/subjects/application/subjects";
import { getOwnTutorProfile } from "@/modules/tutors/application/tutors";
import type { TutorProfileInput } from "@/modules/tutors/domain/tutor";
import { TutorProfileForm } from "@/modules/tutors/presentation/TutorProfileForm";
import { getProfile } from "@/modules/users/application/users";
import { ProfileForm } from "@/modules/users/presentation/ProfileForm";

export const metadata: Metadata = { title: "Perfil" };

export default async function TutorProfilePage() {
  const user = await requireRolePage("TUTOR");
  const [p, tp, subjects, levels, reviews, ratings] = await Promise.all([
    getProfile(prisma, user.id),
    getOwnTutorProfile(prisma, user.id),
    listActiveSubjects(prisma),
    listActiveLevels(prisma),
    listTutorReviews(prisma, user.id),
    ratingsFor(prisma, [user.id]),
  ]);
  const rating = ratings.get(user.id)!;
  return (
    <>
      <PageHeader title="Perfil" />
      <ProfileForm userId={user.id} avatarFile={p.avatarFile} initial={{ firstName: p.firstName, lastName: p.lastName, email: p.email, sex: p.sex, age: String(p.age) }} />
      <TutorProfileForm
        verification={tp.verification}
        subjects={subjects}
        levels={levels}
        initial={{
          bio: tp.bio,
          subjectIds: tp.subjectIds,
          levelIds: tp.levelIds,
          offersVirtual: tp.offersVirtual,
          offersInPerson: tp.offersInPerson,
          zone: tp.zone as TutorProfileInput["zone"],
        }}
      />
      <section aria-labelledby="rep-h" className="flex flex-col gap-3">
        <h2 id="rep-h" className="section-title">
          Reputación · {rating.average !== null ? `★ ${rating.average.toFixed(1)} de 5 (${rating.count} reseñas)` : "sin reseñas aún"}
        </h2>
        <p className="m-0 text-sm text-muted">La puntuación se calcula automáticamente con las reseñas publicadas de tutorías completadas.</p>
        <OwnReviews
          reviews={reviews.map((r) => ({
            id: r.id,
            stars: stars(r.rating),
            rating: r.rating,
            author: `${r.student.firstName} ${r.student.lastName.charAt(0)}.`,
            date: formatDate(r.createdAt, user.timezone),
            subject: r.booking.subject.name,
            text: r.comment,
            reported: r.reportedAt !== null,
          }))}
        />
      </section>
    </>
  );
}
