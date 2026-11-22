import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { listCatalog } from "@/modules/subjects/application/subjects";
import { CatalogManager } from "@/modules/subjects/presentation/CatalogManager";

export const metadata: Metadata = { title: "Materias" };

export default async function AdminSubjectsPage() {
  await requireRolePage("ADMIN");
  const [subjects, levels] = await listCatalog(prisma);
  return (
    <>
      <PageHeader title="Materias" />
      <CatalogManager subjects={subjects.map((s) => ({ id: s.id, name: s.name, active: s.active, tutors: s._count.tutors }))} levels={levels} />
    </>
  );
}
