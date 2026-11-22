import type { Metadata } from "next";
import { AuthHeading, AuthTabs } from "@/modules/auth/presentation/AuthTabs";
import { LoginForm } from "@/modules/auth/presentation/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="BIENVENIDO" subtitle="Bienvenido de nuevo, por favor ingresa tus credenciales" />
      <AuthTabs active="login" />
      <LoginForm />
    </>
  );
}
