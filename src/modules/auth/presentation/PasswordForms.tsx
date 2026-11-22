"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction, type FormState } from "./actions";
import { FieldError } from "./AuthTabs";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <div className="flex flex-col gap-3.5">
      {state.message ? (
        <p role="status" className="m-0 bg-student-tint p-4 text-base leading-snug">
          {state.message} Revisa también tu carpeta de spam.
        </p>
      ) : (
        <form action={action} noValidate className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="field-box">
              Correo de tu cuenta
              <input name="email" type="email" autoComplete="email" required className="field-input" aria-invalid={!!state.fieldErrors?.email} />
            </label>
            <FieldError message={state.fieldErrors?.email} />
          </div>
          {state.error && <p role="alert" className="field-error">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn min-h-13 bg-student text-lg text-white">
            ENVIAR ENLACE
          </button>
        </form>
      )}
      <Link href="/login" className="min-h-11 self-center pt-2 text-base text-student-text underline">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  if (state.message) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="m-0 bg-student-tint p-4 text-base">{state.message}</p>
        <Link href="/login" className="btn min-h-13 bg-student text-lg text-white">INICIAR SESIÓN</Link>
      </div>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1">
        <label className="field-box">
          Nueva contraseña (mínimo 8 caracteres, letras y números)
          <input name="password" type="password" autoComplete="new-password" required className="field-input" aria-invalid={!!state.fieldErrors?.password} />
        </label>
        <FieldError message={state.fieldErrors?.password ?? state.fieldErrors?.token} />
      </div>
      {state.error && <p role="alert" className="field-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn min-h-13 bg-student text-lg text-white">
        GUARDAR CONTRASEÑA
      </button>
    </form>
  );
}
