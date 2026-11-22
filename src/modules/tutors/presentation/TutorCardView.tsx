import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import type { TutorCard } from "../application/tutors";

export function modalityLabel(t: { offersVirtual: boolean; offersInPerson: boolean }) {
  if (t.offersVirtual && t.offersInPerson) return "Virtual y presencial";
  return t.offersVirtual ? "Virtual" : "Presencial";
}

/** Blue tutor card from the search guide. */
export function TutorCardView({ tutor, compact = false }: { tutor: TutorCard; compact?: boolean }) {
  const main = tutor.subjects[0];
  return (
    <article className="flex flex-col">
      <div className="flex flex-1 flex-col items-center gap-3 bg-accent px-3 pt-5 pb-4 text-white">
        <Avatar userId={tutor.id} avatarFile={tutor.avatarFile} size={compact ? 72 : 100} ringed={compact} />
        <h3 className="m-0 text-center text-lg font-normal uppercase">{tutor.name}</h3>
        <div className="grid w-full grid-cols-2">
          <div className="flex flex-col items-center gap-1 border-r-2 border-white text-center">
            {main && <SubjectIcon slug={main.slug} size={40} />}
            <span className="text-xs uppercase">{tutor.subjects.map((s) => s.name).join(", ") || "Sin materias"}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z" />
            </svg>
            <span className="text-xs">
              {tutor.rating.average !== null ? `${tutor.rating.average.toFixed(1)} · ${tutor.rating.count} reseñas` : "Sin reseñas aún"}
            </span>
          </div>
        </div>
        {!compact && (
          <span className="bg-white px-2.5 py-0.5 text-[13px] text-accent-text">
            {modalityLabel(tutor)}
            {tutor.levels.length ? ` · ${tutor.levels.join(", ")}` : ""}
          </span>
        )}
      </div>
      <Link href={`/student/tutors/${tutor.id}`} className="flex min-h-11 items-center justify-center bg-field text-[15px] text-ink hover:underline">
        ver perfil<span className="sr-only"> de {tutor.name}</span>
      </Link>
    </article>
  );
}
