import { requireRolePage } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRolePage("ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
