import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/modules/auth/presentation/AuthTabs";
import { ResetPasswordForm } from "@/modules/auth/presentation/PasswordForms";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <AuthHeading title="NUEVA CONTRASEÑA" subtitle="Elige una contraseña nueva para tu cuenta" />
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="m-0 text-center text-base">
          El enlace está incompleto. <Link href="/forgot-password" className="text-student-text underline">Solicita uno nuevo</Link>.
        </p>
      )}
    </>
  );
}
