"use client";

import { useActionState, useState } from "react";
import { registerAction, type FormState } from "./actions";
import { FieldError } from "./AuthTabs";
import { SEX_OPTIONS, fieldErrors, registerSchema } from "../domain/schemas";

type RoleChoice = "STUDENT" | "TUTOR";

function TextField(props: { name: string; label: string; type?: string; autoComplete?: string; error?: string; defaultValue?: string; className?: string; inputMode?: "numeric" }) {
  const { name, label, error, className = "", ...rest } = props;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="field-box">
        {label}
        <input name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} className="field-input" {...rest} />
      </label>
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, {});
  const [role, setRole] = useState<RoleChoice>((state.values?.role as RoleChoice) || "STUDENT");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [photoName, setPhotoName] = useState("");
  const fe = { ...(state.fieldErrors ?? {}), ...clientErrors };
  const v = state.values ?? {};

  // Client-side check for fast feedback; the server validates again.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      e.preventDefault();
      setClientErrors(fieldErrors(parsed.error));
    } else {
      setClientErrors({});
    }
  };

  const card = (value: RoleChoice, label: string, color: string, icon: React.ReactNode) => (
    <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border-2 text-[15px] tracking-wide ${color} ${role === value ? "border-current bg-[color-mix(in_srgb,currentColor_8%,white)]" : "border-line"}`}>
      <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
      {icon}
      {label}
    </label>
  );

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm text-muted">Quiero registrarme como</legend>
        <div className="grid grid-cols-2 gap-4">
          {card("STUDENT", "ESTUDIANTE", "text-student", (
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8l12-5 12 5-12 5zM29 8v6M10 11v4c0 2 3 4 7 4s7-2 7-4v-4M6 32c1-6 5-9 11-9s10 3 11 9" /></svg>
          ))}
          {card("TUTOR", "PROFESOR", "text-tutor", (
            <svg width="40" height="34" viewBox="0 0 40 34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="7" r="4" /><path d="M3 32V18c0-3 2-5 5-5s5 2 5 5v14M13 17l7-4" /><rect x="17" y="3" width="20" height="16" /><path d="M22 8h11M22 12h11M22 16h6" /></svg>
          ))}
        </div>
      </fieldset>
      {role === "TUTOR" && (
        <p className="m-0 bg-tutor-tint px-3 py-2 text-sm text-success">
          Tu perfil de profesor aparecerá en la búsqueda cuando un administrador lo apruebe. Completa tu descripción y materias en Perfil.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <TextField name="firstName" label="Nombres" autoComplete="given-name" error={fe.firstName} defaultValue={v.firstName} className="col-span-2" />
        <TextField name="lastName" label="Apellidos" autoComplete="family-name" error={fe.lastName} defaultValue={v.lastName} className="col-span-2" />
        <TextField name="email" label="E-mail" type="email" autoComplete="email" error={fe.email} defaultValue={v.email} className="col-span-2" />
        <TextField name="password" label="Contraseña (mínimo 8 caracteres, letras y números)" type="password" autoComplete="new-password" error={fe.password} className="col-span-2" />
        <TextField name="age" label="Edad" type="number" inputMode="numeric" error={fe.age} defaultValue={v.age} />
        <div className="flex flex-col gap-1">
          <label className="field-box">
            Sexo
            <select name="sex" defaultValue={v.sex ?? ""} aria-invalid={!!fe.sex} className="field-input">
              <option value="">Seleccionar…</option>
              {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <FieldError message={fe.sex} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="flex min-h-13 cursor-pointer items-center justify-center gap-2.5 border-4 border-field text-[15px] text-ink-soft focus-within:outline-2">
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 1h12l6 6v18H2zM11 20v-9M7 15l4-4 4 4" /></svg>
            {photoName ? `Foto: ${photoName}` : "Cargar foto de perfil (opcional)…"}
            <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? "")} />
          </label>
          <FieldError message={fe.photo} />
        </div>
      </div>
      {state.error && <p role="alert" className="m-0 bg-[#FDECEA] px-3 py-2 text-[15px] text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={`btn min-h-13 text-lg text-white ${role === "TUTOR" ? "bg-tutor" : "bg-student"}`}>
        {pending ? "CREANDO CUENTA…" : "REGISTRARSE"}
      </button>
    </form>
  );
}
