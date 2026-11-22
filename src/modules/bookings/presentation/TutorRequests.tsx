"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { acceptBookingAction, rejectBookingAction } from "./actions";
import type { BookingView } from "./view";

/** Tutor home: highlighted new requests plus the full pending table with accept/reject. */
export function TutorRequests({ requests, children }: { requests: BookingView[]; children: React.ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [meeting, setMeeting] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sel = requests.find((r) => r.id === selected) ?? null;

  const open = (id: string) => { setSelected(id); setMeeting(""); setError(null); };
  const respond = (accept: boolean) => {
    if (!sel) return;
    const name = `${sel.counterpart.firstName} ${sel.counterpart.lastName}`;
    startTransition(async () => {
      const r = accept
        ? await acceptBookingAction(sel.id, sel.modality === "VIRTUAL" ? { meetingUrl: meeting } : { meetingPlace: meeting })
        : await rejectBookingAction(sel.id);
      if (r.ok) {
        setToast(accept ? `Aceptaste la solicitud de ${name}. El estudiante fue notificado.` : `Rechazaste la solicitud de ${name}. El horario sigue disponible.`);
        setSelected(null);
        setError(null);
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <>
      {toast && <p role="status" className="m-0 bg-tutor-tint px-4 py-3 text-success">{toast}</p>}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-9">
      {children}
      <section aria-labelledby="new-h" className="flex flex-col gap-2.5">
        <h2 id="new-h" className="section-title">Solicitudes nuevas</h2>
        {requests.length === 0 ? (
          <p className="m-0 border-2 border-dashed border-[#9AA1AB] p-6 text-center text-ink-soft">
            No tienes solicitudes pendientes. Mantén tu disponibilidad al día para recibir más.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {requests.slice(0, 2).map((r) => (
              <article key={r.id} className="flex flex-col">
                <div className="flex flex-1 flex-col items-center gap-3 bg-accent px-2.5 py-4.5 text-white">
                  <Avatar userId={r.counterpart.id} avatarFile={r.counterpart.avatarFile} size={72} ringed />
                  <h3 className="m-0 text-center text-[17px] font-normal uppercase">{r.counterpart.firstName} {r.counterpart.lastName}</h3>
                  <SubjectIcon slug={r.subject.slug} size={72} />
                  <span className="uppercase">{r.subject.name}</span>
                </div>
                <button type="button" onClick={() => open(r.id)} className="min-h-11 cursor-pointer bg-field text-[15px] hover:underline">ver solicitud</button>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>

      <section aria-labelledby="req-h" className="flex flex-col gap-2.5">
        <h2 id="req-h" className="section-title">Solicitudes pendientes ({requests.length})</h2>
        <div className="flex min-h-[520px] flex-col gap-3.5 border-4 border-accent p-2.5">
          {requests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] border-collapse text-[17px]">
                <thead>
                  <tr className="bg-ink text-white">
                    <th scope="col" className="px-3 py-2.5 text-left font-normal">ESTUDIANTE</th>
                    <th scope="col" className="px-2 py-2.5 font-normal">MATERIA</th>
                    <th scope="col" className="px-2 py-2.5 font-normal">FECHA</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className={`border-b-2 border-accent ${r.id === selected ? "bg-accent-tint" : ""}`}>
                      <td className="px-3 py-2">
                        <button type="button" aria-pressed={r.id === selected} onClick={() => open(r.id)} className="min-h-10 cursor-pointer text-left text-[19px] underline">
                          {r.counterpart.firstName} {r.counterpart.lastName}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="inline-flex flex-col items-center text-xs text-accent-text"><SubjectIcon slug={r.subject.slug} size={28} />{r.subject.name}</span>
                      </td>
                      <td className="px-2 py-1.5 text-center">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sel ? (
            <div aria-label="Detalle de la solicitud" className="flex flex-col gap-3 bg-[#F2FAF6] p-4">
              <span className="text-[22px]">{sel.counterpart.firstName} {sel.counterpart.lastName} · {sel.subject.name}</span>
              <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4.5 gap-y-1.5">
                <dt className="text-muted">Fecha y hora</dt><dd className="m-0">{sel.date} · {sel.time}</dd>
                <dt className="text-muted">Modalidad</dt><dd className="m-0">{sel.modality === "VIRTUAL" ? "Virtual" : "Presencial"}</dd>
                <dt className="text-muted">Mensaje</dt><dd className="m-0">{sel.note || "—"}</dd>
              </dl>
              <label className="flex flex-col gap-1.5 text-[15px] text-ink-soft">
                {sel.modality === "VIRTUAL" ? "Enlace de tu reunión (Google Meet, Zoom, Teams…)" : "Punto de encuentro (se comparte solo con este estudiante)"}
                <input type={sel.modality === "VIRTUAL" ? "url" : "text"} placeholder={sel.modality === "VIRTUAL" ? "https://" : "Ej.: Biblioteca Central, sala 2"} value={meeting}
                  onChange={(e) => setMeeting(e.target.value)} className="min-h-11 border-0 bg-white px-2.5 text-base text-ink" />
              </label>
              {sel.modality === "VIRTUAL" && (
                <p className="m-0 text-[13px] text-muted">La videollamada ocurre fuera de TutoresOn-Line; solo guardamos el enlace para que el estudiante lo abra.</p>
              )}
              {error && <p role="alert" className="field-error text-[15px]">{error}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={pending} onClick={() => respond(true)} className="btn-accent">ACEPTAR</button>
                <button type="button" disabled={pending} onClick={() => respond(false)} className="btn-danger">RECHAZAR</button>
                <button type="button" onClick={() => setSelected(null)} className="btn text-ink underline">Cerrar</button>
              </div>
            </div>
          ) : (
            requests.length > 0 && <p className="m-0 text-[15px] text-muted">Selecciona un estudiante para ver el detalle y responder.</p>
          )}
          {requests.length === 0 && <p className="m-0 py-10 text-center text-ink-soft">No hay solicitudes por responder.</p>}
        </div>
      </section>
      </div>
    </>
  );
}
