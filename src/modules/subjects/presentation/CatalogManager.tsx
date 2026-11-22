"use client";

import { useState, useTransition } from "react";
import { createSubjectAction, setCatalogActiveAction } from "./actions";

type Subject = { id: string; name: string; active: boolean; tutors: number };
type Level = { id: string; name: string; active: boolean };

export function CatalogManager({ subjects, levels }: { subjects: Subject[]; levels: Level[] }) {
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) { setFeedback({ ok: true, text: r.message ?? success }); after?.(); }
      else setFeedback({ ok: false, text: r.error ?? "No se pudo completar la acción." });
    });

  const toggleBtn = (kind: "subject" | "level", item: { id: string; name: string; active: boolean }) => (
    <button type="button" disabled={pending} aria-label={`${item.active ? "Desactivar" : "Activar"} ${item.name}`}
      onClick={() => run(() => setCatalogActiveAction(kind, item.id, !item.active), `${item.name} ${item.active ? "desactivada" : "activada"}.`)}
      className="btn-outline min-h-10 px-3">
      {item.active ? "Desactivar" : "Activar"}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 max-w-3xl text-[17px] font-light">
        Catálogo que usan los profesores en su perfil y los estudiantes en los filtros de búsqueda. Una materia desactivada deja de aparecer en filtros y perfiles, sin borrar el historial.
      </p>
      {feedback && <p role={feedback.ok ? "status" : "alert"} className={`m-0 px-4 py-3 ${feedback.ok ? "bg-admin-tint" : "bg-[#FDECEA] text-danger"}`}>{feedback.text}</p>}
      <div className="flex flex-wrap items-start gap-8">
        <section aria-labelledby="subj-h" className="flex min-w-0 flex-[2_1_480px] flex-col gap-3">
          <h2 id="subj-h" className="section-title">Materias ({subjects.filter((s) => s.active).length} activas)</h2>
          <form className="flex flex-wrap items-end gap-2.5" onSubmit={(e) => { e.preventDefault(); run(() => createSubjectAction(name), "Materia agregada.", () => setName("")); }}>
            <label className="flex flex-[1_1_260px] flex-col gap-1.5 text-[15px] text-ink-soft">
              Nueva materia
              <input type="text" maxLength={40} placeholder="Ej.: Historia" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 border-0 bg-field px-2.5 text-base text-ink placeholder:text-muted" />
            </label>
            <button type="submit" disabled={pending} className="btn-dark">Agregar materia</button>
          </form>
          <div className="overflow-x-auto border-[3px] border-ink">
            <table className="w-full min-w-[520px] border-collapse text-[17px]">
              <thead>
                <tr className="bg-ink text-white">
                  <th scope="col" className="px-3 py-2.5 text-left font-normal">MATERIA</th>
                  <th scope="col" className="px-2 py-2.5 font-normal">PROFESORES</th>
                  <th scope="col" className="px-2 py-2.5 font-normal">ESTADO</th>
                  <th scope="col" className="px-2 py-2.5 font-normal">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} className={`border-b border-line ${s.active ? "" : "text-muted"}`}>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-2 py-2 text-center">{s.tutors}</td>
                    <td className="px-2 py-2 text-center">{s.active ? "Activa" : "Inactiva"}</td>
                    <td className="px-2 py-1.5 text-center">{toggleBtn("subject", s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-labelledby="lvl-h" className="flex min-w-0 flex-[1_1_260px] flex-col gap-3">
          <h2 id="lvl-h" className="section-title">Niveles educativos</h2>
          <ul className="m-0 list-none border-[3px] border-ink p-0">
            {levels.map((l) => (
              <li key={l.id} className={`flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 ${l.active ? "" : "text-muted"}`}>
                <span>{l.name} · {l.active ? "Activo" : "Inactivo"}</span>
                {toggleBtn("level", l)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
