"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ROLE_HOME, clientIp, createSession, destroySession } from "@/lib/auth/session";
import { DomainError, toActionError } from "@/lib/utils/errors";
import { assertRateLimit } from "@/lib/utils/rate-limit";
import { emailProvider } from "@/modules/notifications/infrastructure/email";
import { AVATAR_MAX_BYTES, detectImageType } from "@/modules/users/domain/profile";
import { updateAvatar } from "@/modules/users/application/users";
import { authenticate, registerUser, requestPasswordReset, resetPassword } from "../application/auth";
import { fieldErrors, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../domain/schemas";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; message?: string; values?: Record<string, string> };

const MINUTE = 60_000;

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  let role: keyof typeof ROLE_HOME;
  try {
    assertRateLimit(`login:${await clientIp()}:${parsed.data.email}`, 5, 10 * MINUTE);
    const user = await authenticate(prisma, parsed.data.email, parsed.data.password);
    await createSession(user.id);
    role = user.role;
  } catch (error) {
    return { ...toActionError(error), values };
  }
  redirect(ROLE_HOME[role]);
}

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = {
    role: form.get("role"),
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
    email: form.get("email"),
    password: form.get("password"),
    age: form.get("age"),
    sex: form.get("sex"),
  };
  const values = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "password").map(([k, v]) => [k, String(v ?? "")]));
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const photo = form.get("photo");
  let photoBytes: Uint8Array | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > AVATAR_MAX_BYTES) return { fieldErrors: { photo: "La imagen debe pesar menos de 2 MB." }, values };
    photoBytes = new Uint8Array(await photo.arrayBuffer());
    if (!detectImageType(photoBytes)) return { fieldErrors: { photo: "Usa una imagen PNG, JPG o WebP." }, values };
  }

  let role: keyof typeof ROLE_HOME;
  try {
    assertRateLimit(`register:${await clientIp()}`, 10, 60 * MINUTE);
    const user = await registerUser(prisma, parsed.data);
    if (photoBytes) await updateAvatar(prisma, user.id, photoBytes);
    await createSession(user.id);
    role = user.role;
  } catch (error) {
    return { ...toActionError(error), values };
  }
  redirect(ROLE_HOME[role]);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    assertRateLimit(`forgot:${await clientIp()}`, 5, 15 * MINUTE);
    await requestPasswordReset(prisma, parsed.data.email, emailProvider, env.APP_URL);
  } catch (error) {
    if (error instanceof DomainError) return toActionError(error);
    // Never reveal delivery problems per address; log and answer generically.
    console.error("[auth] password reset request failed", error);
  }
  return {
    message: `Si existe una cuenta asociada a ${parsed.data.email}, recibirás un enlace para restablecer tu contraseña.`,
  };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({ token: form.get("token"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await resetPassword(prisma, parsed.data.token, parsed.data.password);
  } catch (error) {
    return toActionError(error);
  }
  return { message: "Tu contraseña fue actualizada. Ya puedes iniciar sesión." };
}
