import type { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/modules/auth/presentation/actions";
import { Avatar } from "@/components/ui/Avatar";
import { SidebarNav, type NavItem } from "./SidebarNav";

const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student", label: "Inicio", icon: "home" },
    { href: "/student/search", label: "Buscar tutores", icon: "search" },
    { href: "/student/bookings", label: "Mis tutorías", icon: "book" },
    { href: "/student/profile", label: "Perfil", icon: "user" },
  ],
  TUTOR: [
    { href: "/tutor", label: "Inicio", icon: "home" },
    { href: "/tutor/bookings", label: "Mis tutorías", icon: "book" },
    { href: "/tutor/availability", label: "Disponibilidad", icon: "calendar" },
    { href: "/tutor/profile", label: "Perfil", icon: "user" },
  ],
  ADMIN: [
    { href: "/admin", label: "Usuarios", icon: "users" },
    { href: "/admin/subjects", label: "Materias", icon: "tags" },
    { href: "/admin/reviews", label: "Reseñas", icon: "star" },
  ],
};

const ROLE_LABEL: Record<Role, string> = { STUDENT: "ESTUDIANTE", TUTOR: "PROFESOR", ADMIN: "ADMINISTRADOR" };
const THEME: Record<Role, string> = { STUDENT: "theme-student", TUTOR: "theme-tutor", ADMIN: "theme-admin" };

/** Side menu + content column shared by every signed-in area. */
export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className={`${THEME[user.role]} flex min-h-screen flex-wrap bg-white`}>
      <nav aria-label="Menú principal" className="flex flex-[1_1_240px] flex-col gap-7 border-r border-line px-5 pt-6 pb-7 lg:max-w-[280px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar userId={user.id} avatarFile={user.avatarFile} size={112} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[19px] uppercase">{user.firstName} {user.lastName}</span>
            <span className="text-sm tracking-wide text-accent-text">{ROLE_LABEL[user.role]}</span>
          </div>
        </div>
        <SidebarNav items={NAV[user.role]} />
        <form action={logoutAction} className="mt-auto">
          <button type="submit" className="flex min-h-13 w-full cursor-pointer items-center gap-4 px-5 text-lg text-ink hover:bg-field">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 4H4v20h13M11 14h15M21 9l5 5-5 5" />
            </svg>
            Cerrar sesión
          </button>
        </form>
      </nav>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-4 pt-6 pb-10 sm:px-7">{children}</main>
    </div>
  );
}
