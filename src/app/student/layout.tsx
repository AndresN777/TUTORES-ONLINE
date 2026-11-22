import { requireRolePage } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRolePage("STUDENT");
  return <AppShell user={user}>{children}</AppShell>;
}
