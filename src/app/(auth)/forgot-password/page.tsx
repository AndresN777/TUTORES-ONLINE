import type { Metadata } from "next";
import { AuthHeading } from "@/modules/auth/presentation/AuthTabs";
import { ForgotPasswordForm } from "@/modules/auth/presentation/PasswordForms";

export const metadata: Metadata = { title: "Recuperar acceso" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="RECUPERAR ACCESO" subtitle="Te enviaremos un enlace para restablecer tu contraseña" />
      <ForgotPasswordForm />
    </>
  );
}
