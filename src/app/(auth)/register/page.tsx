import type { Metadata } from "next";
import { AuthHeading, AuthTabs } from "@/modules/auth/presentation/AuthTabs";
import { RegisterForm } from "@/modules/auth/presentation/RegisterForm";

export const metadata: Metadata = { title: "Registro" };

export default function RegisterPage() {
  return (
    <>
      <AuthHeading title="CREA TU CUENTA" subtitle="Elige tu rol y completa tus datos para empezar" />
      <AuthTabs active="register" />
      <RegisterForm />
    </>
  );
}
