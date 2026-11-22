"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type FormState } from "./actions";
import { FieldError } from "./AuthTabs";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const [showPw, setShowPw] = useState(false);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <label className="flex min-h-12 items-center bg-field">
          <span aria-hidden="true" className="flex w-12 justify-center border-r-2 border-[#9AA1AB] text-student">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 9l9-6 9 6v11H3z" /><path d="M3 9l9 6 9-6" /></svg>
          </span>
          <span className="sr-only">Correo electrónico</span>
          <input name="email" type="email" autoComplete="email" required placeholder="Correo electrónico" defaultValue={state.values?.email}
            aria-invalid={!!fe.email} aria-describedby={fe.email ? "email-error" : undefined}
            className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-muted" />
        </label>
        <FieldError id="email-error" message={fe.email} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex min-h-12 items-center bg-field">
          <span aria-hidden="true" className="flex w-12 justify-center border-r-2 border-[#9AA1AB] text-student">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="16" cy="8" r="5" /><path d="M12.5 11.5L3 21l2 2M6 18l2 2" /></svg>
          </span>
          <span className="sr-only">Contraseña</span>
          <input name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required placeholder="Contraseña"
            aria-invalid={!!fe.password} aria-describedby={fe.password ? "password-error" : undefined}
            className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-muted" />
          <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPw}
            className="flex h-12 w-12 cursor-pointer items-center justify-center text-ink-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
        </label>
        <FieldError id="password-error" message={fe.password} />
      </div>
      <Link href="/forgot-password" className="min-h-11 self-end pt-2 text-[15px] text-student-text underline">
        ¿Olvidaste tu contraseña?
      </Link>
      {state.error && <p role="alert" className="m-0 bg-[#FDECEA] px-3 py-2 text-[15px] text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn min-h-13 bg-student text-lg text-white">
        {pending ? "INGRESANDO…" : "INICIAR SESIÓN"}
      </button>
    </form>
  );
}
