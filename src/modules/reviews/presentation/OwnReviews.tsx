"use client";

import { useState, useTransition } from "react";
import { reportReviewAction } from "./actions";

export type OwnReview = { id: string; stars: string; rating: number; author: string; date: string; subject: string; text: string | null; reported: boolean };

/** Reviews a tutor received, with the option to flag one for admin moderation. */
export function OwnReviews({ reviews }: { reviews: OwnReview[] }) {
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const send = (id: string) =>
    startTransition(async () => {
      const r = await reportReviewAction(id, { reason });
      if (r.ok) { setDone(new Set(done).add(id)); setReporting(null); setReason(""); setError(null); }
      else setError(r.error);
    });

  if (reviews.length === 0) return <p className="m-0 text-ink-soft">Aún no tienes reseñas. Aparecerán cuando tus estudiantes califiquen tutorías completadas.</p>;

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {reviews.map((r) => {
        const reported = r.reported || done.has(r.id);
        return (
          <li key={r.id} className="flex flex-col gap-1.5 border-b-2 border-accent pb-2.5">
            <span><span role="img" aria-label={`${r.rating} de 5 estrellas`} className="text-accent">{r.stars}</span> · {r.author} · {r.subject} · {r.date}</span>
            {r.text && <span className="font-light">{r.text}</span>}
            {reported ? (
              <span className="text-sm text-muted">Reportada: pendiente de revisión por un administrador.</span>
            ) : reporting === r.id ? (
              <div className="flex flex-wrap items-end gap-2.5">
                <label className="flex flex-[1_1_260px] flex-col gap-1 text-sm text-ink-soft">
                  Motivo del reporte
                  <input type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-10 border-0 bg-field px-2 text-base text-ink" />
                </label>
                <button type="button" disabled={pending} onClick={() => send(r.id)} className="btn-danger min-h-10">Enviar reporte</button>
                <button type="button" onClick={() => { setReporting(null); setError(null); }} className="btn min-h-10 underline">Cancelar</button>
                {error && <p role="alert" className="field-error w-full">{error}</p>}
              </div>
            ) : (
              <button type="button" onClick={() => { setReporting(r.id); setReason(""); }} className="min-h-9 cursor-pointer self-start text-sm text-ink-soft underline">
                Reportar reseña
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
