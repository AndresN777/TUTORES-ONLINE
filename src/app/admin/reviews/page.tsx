import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/time";
import { PageHeader } from "@/components/shared/PageHeader";
import { listReviewsForModeration } from "@/modules/reviews/application/reviews";
import { stars } from "@/modules/reviews/domain/review";
import { ModerationList } from "@/modules/reviews/presentation/ModerationList";

export const metadata: Metadata = { title: "Reseñas" };

export default async function AdminReviewsPage() {
  const admin = await requireRolePage("ADMIN");
  const reviews = await listReviewsForModeration(prisma);
  return (
    <>
      <PageHeader title="Reseñas" />
      <p className="m-0 max-w-3xl text-[17px] font-light">
        Las reseñas solo pueden escribirlas estudiantes de tutorías completadas. El administrador no edita puntuaciones: solo oculta reseñas que incumplen las normas, y el promedio del profesor se recalcula sin ellas.
      </p>
      <ModerationList
        items={reviews.map((r) => ({
          id: r.id,
          stars: stars(r.rating),
          rating: r.rating,
          author: `${r.student.firstName} ${r.student.lastName.charAt(0)}.`,
          tutor: `${r.tutor.firstName} ${r.tutor.lastName}`,
          subject: r.booking.subject.name,
          date: formatDate(r.booking.startAt, admin.timezone),
          text: r.comment,
          status: r.status,
          reportReason: r.reportReason,
        }))}
      />
    </>
  );
}
