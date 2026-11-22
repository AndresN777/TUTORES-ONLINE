"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/modules/notifications/presentation/actions";

export type NotificationItem = { id: string; message: string; link: string | null; read: boolean; when: string };

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setError(result.ok ? null : (result.error ?? "No se pudo actualizar."));
    });

  return (
    <div className="flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="notifications-panel"
        aria-label={`Notificaciones, ${unread} sin leer`}
        className="relative flex h-12 w-12 cursor-pointer items-center justify-center border-2 border-ink bg-white"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 10a6 6 0 0112 0v5l2 3H4l2-3z" />
          <path d="M10 21h4" />
        </svg>
        {unread > 0 && (
          <span aria-hidden="true" className="absolute -top-2.5 -right-2.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-error px-1 text-[13px] text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <section id="notifications-panel" aria-label="Notificaciones" className="w-full max-w-md border-2 border-ink bg-white sm:w-[440px]">
          <div className="flex items-center justify-between gap-3 bg-ink px-3.5 py-2.5 text-white">
            <span className="text-[17px]">NOTIFICACIONES</span>
            {unread > 0 && (
              <button type="button" disabled={pending} onClick={() => run(markAllNotificationsReadAction)} className="min-h-9 cursor-pointer border border-white px-2.5 text-sm">
                Marcar todas como leídas
              </button>
            )}
          </div>
          {error && <p role="alert" className="field-error px-3.5 py-2">{error}</p>}
          {items.length === 0 ? (
            <p className="m-0 px-3.5 py-6 text-center text-muted">No tienes notificaciones.</p>
          ) : (
            <ul className="m-0 max-h-96 list-none overflow-y-auto p-0">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 border-b border-line px-3.5 py-3 ${n.read ? "bg-white" : "bg-accent-tint"}`}>
                  <span aria-hidden="true" className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-[#C4C8CE]" : "bg-accent"}`} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {n.link ? (
                      <Link href={n.link} onClick={() => !n.read && run(() => markNotificationReadAction(n.id))} className="text-base text-ink underline-offset-2 hover:underline">
                        {n.message}
                      </Link>
                    ) : (
                      <span className="text-base">{n.message}</span>
                    )}
                    <span className="text-[13px] text-muted">
                      {n.when} · {n.read ? "Leída" : "Sin leer"}
                    </span>
                  </div>
                  {!n.read && (
                    <button type="button" disabled={pending} onClick={() => run(() => markNotificationReadAction(n.id))} className="min-h-9 shrink-0 cursor-pointer text-sm text-accent-text underline">
                      Marcar leída
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
