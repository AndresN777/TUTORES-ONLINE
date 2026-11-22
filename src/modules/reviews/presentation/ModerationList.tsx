"use client";

import { useState, useTransition } from "react";
import { moderateReviewAction } from "./actions";

export type ModerationItem = {
  id: string;
  stars: string;
  rating: number;
  author: string;
  tutor: string;
  subject: string;
  date: string;
  text: string | null;
  status: "PUBLISHED" | "HIDDEN";
  reportReason: string | null;
};

type Tab = "reported" | "published" | "hidden";

export function ModerationList({ items }: { items: ModerationItem[] }) {
  const [tab, setTab] = useState<Tab>("reported");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const inTab: Record<Tab, (i: ModerationItem) => boolean> = {
    reported: (i) => i.status === "PUBLISHED" && i.reportReason !== null,
    published: (i) => i.status === "PUBLISHED",
    hidden: (i) => i.status === "HIDDEN",
  };
  const rows = items.filter(inTab[tab]);
  const run = (id: string, action: "hide" | "restore" | "dismiss", success: string) =>
    startTransition(async () => {
      const r = await moderateReviewAction(id, action);
      setFeedback(r.ok ? { ok: true, text: success } : { ok: false, text: r.error });
    });

  return (
    <>
      <div role="group" aria-label="Filtrar reseñas" className="flex flex-wrap gap-1.5 self-start bg-field p-1">
        {([["reported", "Reportadas"], ["published", "Publicadas"], ["hidden", "Ocultas"]] as const).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); setFeedback(null); }}
            className={`min-h-11 cursor-pointer px-4.5 text-[17px] ${tab === k ? "bg-ink text-white" : "text-ink"}`}>
            {label} ({items.filter(inTab[k]).length})
          </button>
        ))}
      </div>
      {feedback && <p role={feedback.ok ? "status" : "alert"} className={`m-0 px-4 py-3 ${feedback.ok ? "bg-admin-tint" : "bg-[#FDECEA] text-danger"}`}>{feedback.text}</p>}
      {rows.length === 0 ? (
        <p className="m-0 border-2 border-dashed border-[#9AA1AB] p-8 text-center text-lg">
          {{ reported: "No hay reseñas reportadas. ¡Todo en orden!", published: "No hay reseñas publicadas.", hidden: "No hay reseñas ocultas." }[tab]}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {rows.map((r) => (
            <li key={r.id} className={`flex flex-col gap-2 border-[3px] px-4 py-3.5 ${r.reportReason && r.status === "PUBLISHED" ? "border-danger" : "border-ink"}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[19px]"><span role="img" aria-label={`${r.rating} de 5 estrellas`}>{r.stars}</span> · {r.author} → {r.tutor}</span>
                <span className="text-sm text-muted">{r.subject} · tutoría del {r.date}</span>
              </div>
              {r.text && <p className="m-0 text-[17px] font-light">“{r.text}”</p>}
              {r.reportReason && r.status === "PUBLISHED" && <p className="m-0 text-[15px] text-danger">Reportada por el profesor: {r.reportReason}</p>}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`px-2.5 py-0.5 text-sm ${r.status === "HIDDEN" ? "bg-[#F1F2F4]" : "bg-tutor-tint"}`}>{r.status === "HIDDEN" ? "Oculta" : "Publicada"}</span>
                {r.status === "PUBLISHED" && (
                  <button type="button" disabled={pending} onClick={() => run(r.id, "hide", `Reseña ocultada. El promedio de ${r.tutor} se recalculó.`)} className="btn min-h-10 bg-danger px-3.5 text-white">Ocultar reseña</button>
                )}
                {r.status === "PUBLISHED" && r.reportReason && (
                  <button type="button" disabled={pending} onClick={() => run(r.id, "dismiss", "Reporte descartado; la reseña sigue publicada.")} className="btn-outline min-h-10 px-3.5">Descartar reporte</button>
                )}
                {r.status === "HIDDEN" && (
                  <button type="button" disabled={pending} onClick={() => run(r.id, "restore", "Reseña publicada de nuevo.")} className="btn-outline min-h-10 px-3.5">Volver a publicar</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
