import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { getProfile } from "@/modules/users/application/users";
import { ProfileForm } from "@/modules/users/presentation/ProfileForm";

export const metadata: Metadata = { title: "Perfil" };

export default async function StudentProfilePage() {
  const user = await requireRolePage("STUDENT");
  const p = await getProfile(prisma, user.id);
  return (
    <>
      <PageHeader title="Perfil" />
      <ProfileForm
        userId={user.id}
        avatarFile={p.avatarFile}
        initial={{ firstName: p.firstName, lastName: p.lastName, email: p.email, sex: p.sex, age: String(p.age) }}
      />
    </>
  );
}
