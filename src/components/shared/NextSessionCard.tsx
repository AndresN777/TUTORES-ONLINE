import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import type { BookingView } from "@/modules/bookings/presentation/view";

/** "Próxima tutoría" block from the style guide, or an empty state with a next step. */
export function NextSessionCard({ booking, href, linkLabel, empty }: { booking: BookingView | null; href: string; linkLabel: string; empty: React.ReactNode }) {
  return (
    <section aria-labelledby="next-h" className="flex flex-col gap-2.5">
      <h2 id="next-h" className="section-title">Próxima tutoría</h2>
      {booking ? (
        <div>
          <div className="grid grid-cols-3 bg-accent py-4 text-white">
            <div className="flex flex-col items-center gap-2.5 px-2 text-center">
              <SubjectIcon slug={booking.subject.slug} size={64} />
              <span className="uppercase">{booking.subject.name}</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 border-x-2 border-white px-2 text-center">
              <Avatar userId={booking.counterpart.id} avatarFile={booking.counterpart.avatarFile} size={64} ringed />
              <span className="uppercase">{booking.counterpart.firstName} {booking.counterpart.lastName}</span>
            </div>
            <div className="flex flex-col items-center gap-2.5 px-2 text-center">
              <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="9" width="38" height="34" rx="4" />
                <path d="M5 18h38M14 4v9M34 4v9M14 25h4M22 25h4M30 25h4M14 32h4M22 32h4M30 32h4" />
              </svg>
              <span>{booking.date} · {booking.time}</span>
            </div>
          </div>
          <Link href={href} className="flex min-h-11 items-center justify-center bg-field text-[15px] text-ink hover:underline">
            {linkLabel}
          </Link>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#9AA1AB] p-6 text-center text-ink-soft">{empty}</div>
      )}
    </section>
  );
}
