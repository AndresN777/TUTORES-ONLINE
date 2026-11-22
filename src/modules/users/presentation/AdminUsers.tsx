"use client";

import { useState, useTransition } from "react";
import { decideVerificationAction, setUserStatusAction } from "./actions";

export type AdminUserRow = { id: string; name: string; email: string; role: "STUDENT" | "TUTOR"; status: "ACTIVE" | "SUSPENDED" };
export type QueueItem = { id: string; name: string; subjects: string; levels: string; modes: string; bio: string; date: string; complete: boolean };

function useAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      setFeedback(r.ok ? { ok: true, text: success } : { ok: false, text: r.error ?? "No se pudo completar la acción." });
    });
  return { pending, feedback, run };
}

function Feedback({ f }: { f: { ok: boolean; text: string } | null }) {
  if (!f) return null;
  return <p role={f.ok ? "status" : "alert"} className={`m-0 px-4 py-3 ${f.ok ? "bg-admin-tint" : "bg-[#FDECEA] text-danger"}`}>{f.text}</p>;
}

export function VerificationQueue({ items }: { items: QueueItem[] }) {
  const { pending, feedback, run } = useAction();
  return (
    <section aria-labelledby="ver-h" className="flex flex-col gap-2.5">
      <h2 id="ver-h" className="section-title">Tutores por verificar ({items.length})</h2>
      <p className="m-0 text-[15px] text-muted">Un perfil de profesor aparece en la búsqueda solo después de ser aprobado.</p>
      <Feedback f={feedback} />
      {items.length === 0 ? (
        <p className="m-0 border-2 border-dashed border-[#9AA1AB] p-5 text-center">No hay perfiles pendientes de verificación.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {items.map((q) => (
            <article key={q.id} className="flex flex-col gap-2 border-[3px] border-ink px-4 py-3.5">
              <h3 className="m-0 text-[22px] font-normal">{q.name}</h3>
              <span className="text-[15px] text-ink-soft">{q.subjects || "Sin materias"} · {q.levels || "Sin niveles"} · {q.modes}</span>
              <p className="m-0 font-light">{q.bio || "Sin descripción todavía."}</p>
              <span className="text-[13px] text-muted">Registrado el {q.date}</span>
              {!q.complete && <span className="text-sm text-[#8A4B00]">Perfil incompleto: se puede aprobar cuando tenga descripción y materias.</span>}
              <div className="flex flex-wrap gap-2.5">
                <button type="button" disabled={pending || !q.complete} onClick={() => run(() => decideVerificationAction(q.id, true), `Perfil de ${q.name} aprobado: ya aparece en la búsqueda.`)} className="btn bg-tutor text-white">
                  Aprobar perfil
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => decideVerificationAction(q.id, false), `Perfil de ${q.name} rechazado. Se le notificó para que lo corrija.`)} className="btn-danger">
                  Rechazar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const { pending, feedback, run } = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <>
      <Feedback f={feedback} />
      <div className="overflow-x-auto border-[3px] border-ink">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-ink text-white">
              <th scope="col" className="px-3 py-2.5 text-left font-normal">NOMBRE</th>
              <th scope="col" className="px-3 py-2.5 text-left font-normal">CORREO</th>
              <th scope="col" className="px-2 py-2.5 font-normal">ROL</th>
              <th scope="col" className="px-2 py-2.5 font-normal">ESTADO</th>
              <th scope="col" className="px-2 py-2.5 font-normal">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const active = u.status === "ACTIVE";
              const next = active ? "SUSPENDED" : "ACTIVE";
              return (
                <tr key={u.id} className="border-b border-line">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 text-ink-soft">{u.email}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`px-2.5 py-0.5 text-sm ${u.role === "STUDENT" ? "bg-student-tint text-[#0056B3]" : "bg-tutor-tint text-success"}`}>{u.role === "STUDENT" ? "Estudiante" : "Profesor"}</span>
                  </td>
                  <td className="px-2 py-2 text-center">{active ? "Activo" : "Suspendido"}</td>
                  <td className="px-2 py-1.5 text-center">
                    {confirm === u.id ? (
                      <span className="inline-flex gap-1.5">
                        <button type="button" disabled={pending} onClick={() => { setConfirm(null); run(() => setUserStatusAction(u.id, next), active ? `${u.name} fue suspendido: no podrá iniciar sesión ni recibir reservas.` : `${u.name} fue reactivado.`); }}
                          className={`btn min-h-10 px-3 text-white ${active ? "bg-danger" : "bg-tutor"}`}>Confirmar</button>
                        <button type="button" onClick={() => setConfirm(null)} className="btn-outline min-h-10 px-3">No</button>
                      </span>
                    ) : (
                      <button type="button" aria-label={`${active ? "Suspender" : "Reactivar"} a ${u.name}`} onClick={() => setConfirm(u.id)}
                        className={`btn min-h-10 border-2 bg-white px-3 ${active ? "border-danger text-danger" : "border-tutor text-tutor-text"}`}>
                        {active ? "Suspender" : "Reactivar"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="m-0 p-6 text-center">Ningún usuario coincide con la búsqueda.</p>}
      </div>
    </>
  );
}
