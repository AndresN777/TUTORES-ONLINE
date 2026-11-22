"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createBookingAction } from "./actions";

export type SlotDay = { label: string; slots: { startIso: string; time: string; available: boolean; aria: string }[] };

type Props = {
  tutorId: string;
  tutorName: string;
  subjects: { id: string; name: string }[];
  offersVirtual: boolean;
  offersInPerson: boolean;
  zone: string | null;
  days: SlotDay[];
  weekLabel: string;
  prevHref: string | null;
  nextHref: string | null;
  timezoneLabel: string;
};

export function BookingForm(p: Props) {
  const [subjectId, setSubjectId] = useState(p.subjects[0]?.id ?? "");
  const [modality, setModality] = useState<"VIRTUAL" | "IN_PERSON">(p.offersVirtual ? "VIRTUAL" : "IN_PERSON");
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chosen = p.days.flatMap((d) => d.slots.map((s) => ({ ...s, day: d.label }))).find((s) => s.startIso === slot);

  const submit = () => {
    if (!slot) return setError("Elige un horario disponible para enviar la solicitud.");
    setError(null);
    startTransition(async () => {
      const result = await createBookingAction({ tutorId: p.tutorId, subjectId, modality, startAt: slot, note: note.trim() || undefined });
      if (result.ok) {
        setSent(`${p.subjects.find((s) => s.id === subjectId)?.name}, ${chosen?.day} a las ${chosen?.time}, modalidad ${modality === "VIRTUAL" ? "virtual" : "presencial"}.`);
      } else {
        setError(result.error);
        setSlot(null);
      }
    });
  };

  if (p.subjects.length === 0) {
    return <p className="m-0 text-ink-soft">Este profesor no tiene materias activas en este momento.</p>;
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-3 bg-accent-tint p-5">
        <span className="text-[22px]">Solicitud enviada</span>
        <span className="text-[17px] leading-normal font-light">
          {sent} Estado: <strong className="font-medium">Pendiente</strong>. Te avisaremos cuando {p.tutorName} la acepte o la decline.
        </span>
        <div className="flex flex-wrap gap-3">
          <Link href="/student/bookings" className="btn-accent">Ir a Mis tutorías</Link>
          <button type="button" onClick={() => { setSent(null); setSlot(null); setNote(""); }} className="btn-outline">Solicitar otro horario</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="grid grid-cols-2 gap-3.5">
        <label className="flex flex-col gap-1.5 text-[15px] text-muted">
          Materia
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="min-h-11 border-0 bg-field px-2 text-[17px] text-ink">
            {p.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-1.5 text-[15px] text-muted">Modalidad</legend>
          {p.offersVirtual && (
            <label className="flex min-h-8 items-center gap-2.5 text-[17px]">
              <input type="radio" name="modality" checked={modality === "VIRTUAL"} onChange={() => setModality("VIRTUAL")} className="h-5 w-5 accent-[var(--color-accent)]" />
              Virtual
            </label>
          )}
          {p.offersInPerson && (
            <label className="flex min-h-8 items-center gap-2.5 text-[17px]">
              <input type="radio" name="modality" checked={modality === "IN_PERSON"} onChange={() => setModality("IN_PERSON")} className="h-5 w-5 accent-[var(--color-accent)]" />
              Presencial
            </label>
          )}
        </fieldset>
      </div>
      <p className="m-0 bg-accent-tint px-3 py-2.5 text-[15px] leading-snug">
        {modality === "VIRTUAL"
          ? "La clase no se realiza dentro de TutoresOn-Line: al aceptar, el profesor agrega el enlace de su reunión (Google Meet, Zoom, Teams…) y lo verás en Mis tutorías."
          : `Presencial en zona ${p.zone ?? "por definir"}. El punto de encuentro exacto se comparte solo después de que el profesor acepte.`}
      </p>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {p.prevHref ? <Link href={p.prevHref} scroll={false} aria-label="Semana anterior" className="btn-outline w-11 px-0 text-xl">‹</Link> : <span className="w-11" />}
          <span className="text-[17px]">Semana del {p.weekLabel}</span>
          {p.nextHref ? <Link href={p.nextHref} scroll={false} aria-label="Semana siguiente" className="btn-outline w-11 px-0 text-xl">›</Link> : <span className="w-11" />}
        </div>
        {p.days.length === 0 ? (
          <p className="m-0 py-6 text-center text-ink-soft">Este profesor no tiene horarios publicados esta semana. Prueba con la siguiente.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-2">
            {p.days.map((d) => (
              <div key={d.label} className="flex flex-col gap-1.5">
                <span className="text-center text-sm text-ink-soft">{d.label}</span>
                {d.slots.map((s) => {
                  const on = slot === s.startIso;
                  return (
                    <button key={s.startIso} type="button" disabled={!s.available} aria-pressed={on} aria-label={s.aria} onClick={() => { setSlot(s.startIso); setError(null); }}
                      className={`min-h-10 cursor-pointer border-2 text-[15px] disabled:opacity-100 ${on ? "border-accent bg-accent text-white" : s.available ? "border-accent bg-white text-ink" : "border-line bg-[#F3F4F6] text-muted line-through"}`}>
                      {s.time}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <p className="m-0 text-[13px] text-muted">Los horarios tachados ya están ocupados o no se pueden reservar. Horas en {p.timezoneLabel}.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-[15px] text-muted">
        Mensaje para el profesor (opcional)
        <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: necesito repasar cinemática para mi examen"
          className="resize-y border-0 bg-field p-2.5 text-base text-ink placeholder:text-muted" />
      </label>
      {error && <p role="alert" className="field-error text-[15px]">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{chosen ? `${p.subjects.find((s) => s.id === subjectId)?.name} · ${chosen.day} · ${chosen.time}` : "Ningún horario seleccionado"}</span>
        <button type="button" onClick={submit} disabled={pending} className="btn-accent min-h-13 px-7 text-lg">
          {pending ? "ENVIANDO…" : "ENVIAR SOLICITUD"}
        </button>
      </div>
    </div>
  );
}
