import { requireRolePage } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRolePage("TUTOR");
  return <AppShell user={user}>{children}</AppShell>;
}
