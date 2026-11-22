import type { Metadata } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/time";
import { PageHeader } from "@/components/shared/PageHeader";
import { AutoSubmitForm } from "@/components/shared/AutoSubmitForm";
import { listVerificationQueue } from "@/modules/tutors/application/tutors";
import { modalityLabel } from "@/modules/tutors/presentation/TutorCardView";
import { listUsers, userStats } from "@/modules/users/application/users";
import { UsersTable, VerificationQueue } from "@/modules/users/presentation/AdminUsers";

export const metadata: Metadata = { title: "Usuarios" };

const filtersSchema = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  role: z.enum(["STUDENT", "TUTOR"]).optional().catch(undefined),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional().catch(undefined),
});

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireRolePage("ADMIN");
  const f = filtersSchema.parse(await searchParams);
  const [stats, queue, users] = await Promise.all([userStats(prisma), listVerificationQueue(prisma), listUsers(prisma, f)]);
  const select = "min-h-11 border-0 bg-field px-2 text-base";

  return (
    <>
      <PageHeader title="Usuarios" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        {[
          [stats.students, "ESTUDIANTES"],
          [stats.tutors, "PROFESORES"],
          [stats.suspended, "CUENTAS SUSPENDIDAS"],
          [stats.pending, "POR VERIFICAR"],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-col gap-0.5 bg-ink px-4.5 py-4 text-white">
            <span className="pt-2 font-display text-[64px] leading-[0.9] font-semibold">{value}</span>
            <span className="text-[15px] tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      <VerificationQueue
        items={queue.map((q) => ({
          id: q.id,
          name: `${q.firstName} ${q.lastName}`,
          subjects: q.tutorProfile!.subjects.map((s) => s.subject.name).join(", "),
          levels: q.tutorProfile!.levels.map((l) => l.level.name).join(", "),
          modes: modalityLabel(q.tutorProfile!) + (q.tutorProfile!.offersInPerson && q.tutorProfile!.zone ? ` (${q.tutorProfile!.zone})` : ""),
          bio: q.tutorProfile!.bio,
          date: formatDate(q.createdAt, admin.timezone),
          complete: q.tutorProfile!.bio.length >= 30 && q.tutorProfile!.subjects.length > 0,
        }))}
      />

      <section aria-labelledby="users-h" className="flex flex-col gap-3">
        <h2 id="users-h" className="section-title">Todos los usuarios</h2>
        <AutoSubmitForm action="/admin" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-[1_1_240px] flex-col gap-1.5 text-[15px] text-ink-soft">
            Buscar por nombre o correo
            <input type="search" name="q" defaultValue={f.q} className="min-h-11 border-0 bg-field px-2.5 text-base text-ink" />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] text-ink-soft">
            Rol
            <select name="role" defaultValue={f.role ?? ""} className={select}>
              <option value="">Todos</option>
              <option value="STUDENT">Estudiantes</option>
              <option value="TUTOR">Profesores</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] text-ink-soft">
            Estado
            <select name="status" defaultValue={f.status ?? ""} className={select}>
              <option value="">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="SUSPENDED">Suspendidos</option>
            </select>
          </label>
          <noscript><button type="submit" className="btn-dark">Filtrar</button></noscript>
        </AutoSubmitForm>
        <UsersTable
          users={users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email, role: u.role as "STUDENT" | "TUTOR", status: u.status }))}
        />
      </section>
    </>
  );
}
