"use client";

import { useMemo, useState, useTransition } from "react";
import { SUPPORTED_TIMEZONES, WEEKDAY_LABELS, displayLocalDate, formatMinute } from "@/lib/utils/time";
import { SLOT_DURATIONS, gridStartMinutes, type WeeklySlot } from "../domain/slots";
import { saveAvailabilityAction } from "./actions";

type State = { timezone: string; slotMinutes: number; slots: WeeklySlot[]; exceptions: string[] };
type Props = State & { booked: WeeklySlot[]; today: string };

const key = (s: WeeklySlot) => `${s.weekday}-${s.startMinute}`;
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function AvailabilityEditor({ booked, today, ...initial }: Props) {
  const [saved, setSaved] = useState<State>(initial);
  const [draft, setDraft] = useState<State>(initial);
  const [excDate, setExcDate] = useState("");
  const [excError, setExcError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = gridStartMinutes(draft.slotMinutes);
  const on = useMemo(() => new Set(draft.slots.map(key)), [draft.slots]);
  const locked = useMemo(() => new Set(booked.map(key)), [booked]);
  const visible = draft.slots.filter((s) => rows.includes(s.startMinute));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = (patch: Partial<State>) => { setDraft({ ...draft, ...patch }); setMessage(null); };
  const toggle = (s: WeeklySlot) => update({ slots: on.has(key(s)) ? draft.slots.filter((x) => key(x) !== key(s)) : [...draft.slots, s] });

  const addException = () => {
    if (!excDate) return setExcError("Elige una fecha.");
    if (excDate < today) return setExcError("Elige una fecha futura.");
    if (draft.exceptions.includes(excDate)) return setExcError("Esa fecha ya está en la lista.");
    update({ exceptions: [...draft.exceptions, excDate].sort() });
    setExcDate("");
    setExcError(null);
  };

  const save = () =>
    startTransition(async () => {
      // Blocks that don't fit the chosen duration are dropped instead of failing validation.
      const payload = { ...draft, slots: visible };
      const r = await saveAvailabilityAction(payload);
      if (r.ok) { setSaved(payload); setDraft(payload); setMessage({ ok: true, text: "Disponibilidad guardada" }); }
      else setMessage({ ok: false, text: r.error });
    });

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 max-w-3xl text-[17px] font-light">
        Marca los bloques semanales en los que aceptas tutorías. Los estudiantes solo pueden solicitar bloques disponibles que no estén ya reservados.
      </p>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-w-64 flex-col gap-1.5 text-[15px] text-ink-soft">
          Zona horaria
          <select value={draft.timezone} onChange={(e) => update({ timezone: e.target.value })} className="min-h-11 border-0 bg-field px-2 text-[17px] text-ink">
            {SUPPORTED_TIMEZONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-52 flex-col gap-1.5 text-[15px] text-ink-soft">
          Duración de cada tutoría
          <select value={draft.slotMinutes} onChange={(e) => update({ slotMinutes: Number(e.target.value) })} className="min-h-11 border-0 bg-field px-2 text-[17px] text-ink">
            {SLOT_DURATIONS.map((d) => <option key={d} value={d}>{d} minutos</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4.5 text-[15px]">
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4.5 w-4.5 bg-accent" />Disponible</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4.5 w-4.5 border-2 border-[#C4C8CE]" />No disponible</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4.5 w-4.5 bg-ink" />Reservado (no editable)</span>
        <span className="ml-auto">{visible.length} bloques disponibles por semana</span>
      </div>

      <div className="overflow-x-auto border-4 border-ink">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-ink text-white">
              <th scope="col" className="w-32 p-2.5 font-normal">HORA</th>
              {DAYS.map((d) => <th key={d} scope="col" className="p-2.5 font-normal">{WEEKDAY_LABELS[d]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m} className="border-b border-line">
                <th scope="row" className="px-2.5 py-1.5 text-center font-normal whitespace-nowrap">{formatMinute(m)} – {formatMinute(m + draft.slotMinutes)}</th>
                {DAYS.map((d) => {
                  const s = { weekday: d, startMinute: m };
                  const isBooked = locked.has(key(s));
                  const active = on.has(key(s));
                  return (
                    <td key={d} className="p-1">
                      <button type="button" disabled={isBooked} aria-pressed={active} onClick={() => toggle(s)}
                        aria-label={`${WEEKDAY_LABELS[d]} ${formatMinute(m)}, ${isBooked ? "reservado" : active ? "disponible" : "no disponible"}`}
                        className={`min-h-11 w-full cursor-pointer border-2 text-sm text-white disabled:opacity-100 ${isBooked ? "border-ink bg-ink" : active ? "border-accent bg-accent" : "border-[#C4C8CE] bg-white"}`}>
                        {isBooked ? "Reservado" : active ? "Disponible" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="exc-h" className="flex max-w-2xl flex-col gap-2.5">
        <h2 id="exc-h" className="section-title">Excepciones (días sin tutorías)</h2>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col gap-1.5 text-[15px] text-ink-soft">
            Fecha
            <input type="date" min={today} value={excDate} onChange={(e) => { setExcDate(e.target.value); setExcError(null); }} className="min-h-11 border-0 bg-field px-2 text-base" />
          </label>
          <button type="button" onClick={addException} className="btn border-2 border-accent bg-white text-accent-text">Agregar excepción</button>
        </div>
        {excError && <p role="alert" className="field-error text-[15px]">{excError}</p>}
        {draft.exceptions.length === 0 ? (
          <p className="m-0 text-ink-soft">Sin excepciones: atiendes todas las semanas según tu horario.</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {draft.exceptions.map((x) => (
              <li key={x} className="inline-flex items-center gap-1 bg-accent-tint pl-3">
                {displayLocalDate(x)}
                <button type="button" aria-label={`Quitar excepción del ${displayLocalDate(x)}`} onClick={() => update({ exceptions: draft.exceptions.filter((y) => y !== x) })}
                  className="h-10 w-10 cursor-pointer text-xl">×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {message && <span role={message.ok ? "status" : "alert"} className={message.ok ? "text-success" : "text-error"}>{message.ok ? "✓ " : ""}{message.text}</span>}
        {dirty && <span className="text-[15px] text-muted">Tienes cambios sin guardar</span>}
        <button type="button" disabled={!dirty || pending} onClick={() => { setDraft(saved); setExcError(null); }} className="btn-dark min-h-13 min-w-40 text-lg">DESCARTAR</button>
        <button type="button" disabled={!dirty || pending} onClick={save} className="btn-accent min-h-13 min-w-40 text-lg">{pending ? "GUARDANDO…" : "GUARDAR"}</button>
      </div>
    </div>
  );
}
