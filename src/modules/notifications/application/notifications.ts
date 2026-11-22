import type { Db } from "@/lib/db";
import { DomainError } from "@/lib/utils/errors";

/**
 * In-app notifications. Use cases call `notify` after their own state change;
 * notifications never decide business outcomes.
 */
export async function notify(db: Db, userId: string, message: string, link?: string): Promise<void> {
  await db.notification.create({ data: { userId, message, link } });
}

export function listNotifications(db: Db, userId: string, take = 15) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, message: true, link: true, readAt: true, createdAt: true },
  });
}

export async function markNotificationRead(db: Db, userId: string, notificationId: string): Promise<void> {
  const { count } = await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    const exists = await db.notification.findFirst({ where: { id: notificationId, userId }, select: { id: true } });
    if (!exists) throw new DomainError("NOT_FOUND", "La notificación no existe.");
  }
}

export async function markAllNotificationsRead(db: Db, userId: string): Promise<void> {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
