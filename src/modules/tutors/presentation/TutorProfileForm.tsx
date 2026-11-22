"use client";

import { useState, useTransition } from "react";
import { fieldErrors } from "@/modules/auth/domain/schemas";
import { ZONES, tutorProfileSchema, type TutorProfileInput } from "../domain/tutor";
import { updateTutorProfileAction } from "./actions";

type Option = { id: string; name: string };
type Props = { initial: TutorProfileInput; subjects: Option[]; levels: Option[]; verification: "PENDING" | "APPROVED" | "REJECTED" };

const STATUS = {
  APPROVED: ["Perfil verificado: apareces en la búsqueda.", "bg-tutor-tint text-success"],
  PENDING: ["Perfil en revisión por un administrador.", "bg-[#FFF4E0] text-[#8A4B00]"],
  REJECTED: ["Perfil no aprobado: corrígelo y guárdalo para una nueva revisión.", "bg-[#FDECEA] text-danger"],
} as const;

export function TutorProfileForm({ initial, subjects, levels, verification }: Props) {
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const set = (patch: Partial<TutorProfileInput>) => { setForm({ ...form, ...patch }); setMessage(null); };
  const toggle = (list: "subjectIds" | "levelIds", id: string) => set({ [list]: form[list].includes(id) ? form[list].filter((x) => x !== id) : [...form[list], id] });

  const save = () => {
    const parsed = tutorProfileSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    startTransition(async () => {
      const r = await updateTutorProfileAction(parsed.data);
      if (r.ok) { setSaved(form); setErrors({}); setMessage({ ok: true, text: "Perfil docente actualizado" }); }
      else { setErrors(r.fieldErrors ?? {}); setMessage({ ok: false, text: r.error }); }
    });
  };

  const box = "m-0 flex flex-col gap-1 border-2 border-line px-4 py-3";
  const legend = "px-1.5 text-accent-text";
  const check = "flex min-h-9 cursor-pointer items-center gap-2.5 text-[17px]";

  return (
    <section aria-labelledby="teach-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="teach-h" className="section-title">Perfil docente</h2>
        <span role="status" className={`px-3 py-1 text-[15px] ${STATUS[verification][1]}`}>{STATUS[verification][0]}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="field-box text-lg">
          descripción ({form.bio.length}/500)
          <textarea rows={3} maxLength={500} value={form.bio} onChange={(e) => set({ bio: e.target.value })} aria-invalid={!!errors.bio} className="field-input resize-y" />
        </label>
        {errors.bio && <p className="field-error">{errors.bio}</p>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
        <fieldset className={box}>
          <legend className={legend}>Materias que enseñas</legend>
          {subjects.map((s) => (
            <label key={s.id} className={check}><input type="checkbox" checked={form.subjectIds.includes(s.id)} onChange={() => toggle("subjectIds", s.id)} className="h-5 w-5 accent-[var(--color-accent)]" />{s.name}</label>
          ))}
          {errors.subjectIds && <p className="field-error">{errors.subjectIds}</p>}
        </fieldset>
        <fieldset className={box}>
          <legend className={legend}>Niveles</legend>
          {levels.map((l) => (
            <label key={l.id} className={check}><input type="checkbox" checked={form.levelIds.includes(l.id)} onChange={() => toggle("levelIds", l.id)} className="h-5 w-5 accent-[var(--color-accent)]" />{l.name}</label>
          ))}
          {errors.levelIds && <p className="field-error">{errors.levelIds}</p>}
        </fieldset>
        <fieldset className={box}>
          <legend className={legend}>Modalidad</legend>
          <label className={check}><input type="checkbox" checked={form.offersVirtual} onChange={(e) => set({ offersVirtual: e.target.checked })} className="h-5 w-5 accent-[var(--color-accent)]" />Virtual (enlace externo)</label>
          <label className={check}><input type="checkbox" checked={form.offersInPerson} onChange={(e) => set({ offersInPerson: e.target.checked, zone: e.target.checked ? form.zone : null })} className="h-5 w-5 accent-[var(--color-accent)]" />Presencial</label>
          {errors.modes && <p className="field-error">{errors.modes}</p>}
          {form.offersInPerson && (
            <label className="mt-2 flex flex-col gap-1.5 text-[15px] text-ink-soft">
              Zona para presencial (ciudad/sector)
              <select value={form.zone ?? ""} onChange={(e) => set({ zone: (e.target.value || null) as TutorProfileInput["zone"] })} className="min-h-10 border-0 bg-field px-2 text-base text-ink">
                <option value="">Seleccionar…</option>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
              {errors.zone && <span className="field-error">{errors.zone}</span>}
            </label>
          )}
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-5">
        {message && <span role={message.ok ? "status" : "alert"} className={message.ok ? "text-success" : "text-error"}>{message.ok ? "✓ " : ""}{message.text}</span>}
        {dirty && <span className="text-[15px] text-muted">Tienes cambios sin guardar</span>}
        <button type="button" disabled={!dirty || pending} onClick={() => { setForm(saved); setErrors({}); }} className="btn-dark min-h-12 min-w-36">CANCELAR</button>
        <button type="button" disabled={!dirty || pending} onClick={save} className="btn-accent min-h-12 min-w-36">GUARDAR</button>
      </div>
    </section>
  );
}
