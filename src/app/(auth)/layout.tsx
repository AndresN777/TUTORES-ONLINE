import { redirect } from "next/navigation";
import { ROLE_HOME, getCurrentUser } from "@/lib/auth/session";
import { BrandMark } from "@/components/shared/BrandMark";

const BENEFITS = ["Sesiones virtuales y presenciales", "Horarios flexibles", "Clases sincrónicas"];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  return (
    <div className="flex min-h-screen flex-wrap bg-white">
      <main className="flex flex-[1_1_420px] justify-center px-6 py-12">
        <div className="flex w-full max-w-[380px] flex-col gap-5">
          <div aria-hidden="true" className="mx-auto flex h-24 w-24 items-center justify-center rounded-[18px] border-[5px] border-student pt-1.5 font-display text-[44px] font-bold text-student">
            TO
          </div>
          {children}
        </div>
      </main>
      <section aria-label="Sobre TutoresOn-Line" className="relative flex flex-[999_1_480px] flex-col gap-10 overflow-hidden bg-ink px-6 py-14 text-white sm:px-12">
        <div aria-hidden="true" className="absolute top-[72px] left-16 h-[370px] w-[46%] bg-[#0B1B2B]" />
        <div aria-hidden="true" className="absolute top-[360px] right-0 h-[370px] w-1/3 bg-[#0B2420]" />
        <BrandMark inverted className="relative justify-end" />
        <div className="relative mt-10 flex max-w-[580px] flex-col gap-3.5 lg:mt-24">
          <h2 className="m-0 font-display text-[58px] leading-[0.95] font-semibold">CONECTA CON EL TUTOR PERFECTO</h2>
          <p className="m-0 text-[17px] leading-relaxed font-light text-[#DCE3EA]">
            Encuentra tutores por materia, nivel y modalidad. Revisa su reputación, elige un horario disponible y envía tu solicitud en
            minutos. Los profesores gestionan su agenda y responden desde su propio panel.
          </p>
        </div>
        <ul className="relative m-0 flex list-none flex-col gap-6 p-0 text-[19px]">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-4">
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="13" cy="13" r="13" fill="#00A37A" />
                <path d="M7 13.5l4 4 8-8" fill="none" stroke="#0A1119" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
