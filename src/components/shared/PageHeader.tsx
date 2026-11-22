import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate, formatTime } from "@/lib/utils/time";
import { listNotifications } from "@/modules/notifications/application/notifications";
import { BrandMark } from "./BrandMark";
import { NotificationBell } from "./NotificationBell";

/** Page title, notifications and wordmark, as in the style guide's header row. */
export async function PageHeader({ title }: { title: string }) {
  const user = await getCurrentUser();
  const notifications = user ? await listNotifications(prisma, user.id) : [];
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <h1 className="m-0 pt-2 font-display text-6xl leading-[0.85] font-semibold text-accent uppercase sm:text-[76px]">{title}</h1>
      <div className="flex flex-wrap items-start justify-end gap-5">
        {user && (
          <NotificationBell
            items={notifications.map((n) => ({
              id: n.id,
              message: n.message,
              link: n.link,
              read: n.readAt !== null,
              when: `${formatDate(n.createdAt, user.timezone)} · ${formatTime(n.createdAt, user.timezone)}`,
            }))}
          />
        )}
        <BrandMark className="hidden md:flex" />
      </div>
    </header>
  );
}
