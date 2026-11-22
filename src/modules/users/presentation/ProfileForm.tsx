"use client";

import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SEX_OPTIONS, fieldErrors } from "@/modules/auth/domain/schemas";
import { AVATAR_MAX_BYTES, profileSchema } from "../domain/profile";
import { updateAvatarAction, updateProfileAction } from "./actions";

type Values = { firstName: string; lastName: string; email: string; password: string; sex: string; age: string };

const FIELDS: { key: keyof Values; label: string; type: string; auto?: string; placeholder?: string }[] = [
  { key: "firstName", label: "nombres", type: "text", auto: "given-name" },
  { key: "lastName", label: "apellidos", type: "text", auto: "family-name" },
  { key: "email", label: "email", type: "email", auto: "email" },
  { key: "password", label: "nueva contraseña", type: "password", auto: "new-password", placeholder: "Déjala vacía para no cambiarla" },
  { key: "sex", label: "sexo", type: "select" },
  { key: "age", label: "edad", type: "number" },
];

export function ProfileForm({ userId, avatarFile, initial }: { userId: string; avatarFile: string | null; initial: Omit<Values, "password"> }) {
  const [saved, setSaved] = useState<Values>({ ...initial, password: "" });
  const [form, setForm] = useState<Values>({ ...initial, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const save = () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setMessage(null);
      return;
    }
    startTransition(async () => {
      const r = await updateProfileAction(form);
      if (r.ok) {
        const next = { ...form, password: "" };
        setSaved(next);
        setForm(next);
        setErrors({});
        setMessage({ ok: true, text: "Cambios guardados" });
      } else {
        setErrors(r.fieldErrors ?? {});
        setMessage({ ok: false, text: r.error });
      }
    });
  };

  const uploadPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) return setPhotoError("La imagen debe pesar menos de 2 MB.");
    const data = new FormData();
    data.set("avatar", file);
    startTransition(async () => {
      const r = await updateAvatarAction(data);
      setPhotoError(r.ok ? null : r.error);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <Avatar userId={userId} avatarFile={avatarFile} size={86} />
          <div className="flex flex-col">
            <span className="text-4xl leading-tight text-accent uppercase sm:text-[44px]">{saved.firstName} {saved.lastName}</span>
            <span className="text-2xl">{saved.email}</span>
          </div>
        </div>
        <label className="btn-accent min-h-16 px-6 text-2xl focus-within:outline-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7c.4-.4.4-1 0-1.4l-2.3-2.3a1 1 0 00-1.4 0l-1.8 1.8 3.7 3.7z" /></svg>
          {pending ? "Subiendo…" : "Editar imagen"}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
        </label>
      </div>
      {photoError && <p role="alert" className="field-error text-[15px]">{photoError}</p>}

      <h2 className="section-title">Datos personales</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-x-12 gap-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="field-box text-lg">
              {f.label}
              {f.type === "select" ? (
                <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="field-input text-xl">
                  {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type} autoComplete={f.auto} placeholder={f.placeholder} value={form[f.key]} aria-invalid={!!errors[f.key]}
                  onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setMessage(null); }} className="field-input text-xl placeholder:text-muted" />
              )}
            </label>
            {errors[f.key] && <p className="field-error">{errors[f.key]}</p>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-5">
        {message && <span role={message.ok ? "status" : "alert"} className={message.ok ? "text-success" : "text-error"}>{message.ok ? "✓ " : ""}{message.text}</span>}
        {dirty && <span className="text-[15px] text-muted">Tienes cambios sin guardar</span>}
        <button type="button" disabled={!dirty || pending} onClick={() => { setForm(saved); setErrors({}); }} className="btn-dark min-h-13 min-w-40 text-lg">CANCELAR</button>
        <button type="button" disabled={!dirty || pending} onClick={save} className="btn-accent min-h-13 min-w-40 text-lg">GUARDAR</button>
      </div>
    </div>
  );
}
