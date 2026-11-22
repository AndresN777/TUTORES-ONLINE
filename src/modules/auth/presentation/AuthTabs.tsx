import Link from "next/link";

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="m-0 font-display text-[52px] leading-[0.9] font-semibold">{title}</h1>
      <p className="m-0 text-[15px] font-light text-muted">{subtitle}</p>
    </div>
  );
}

export function AuthTabs({ active }: { active: "login" | "register" }) {
  const cls = (on: boolean) => `flex min-h-11 flex-1 items-center justify-center text-[17px] ${on ? "bg-student text-white" : "text-ink hover:bg-white"}`;
  return (
    <nav aria-label="Acceso" className="flex gap-1 bg-field p-1">
      <Link href="/login" aria-current={active === "login" ? "page" : undefined} className={cls(active === "login")}>
        Iniciar sesión
      </Link>
      <Link href="/register" aria-current={active === "register" ? "page" : undefined} className={cls(active === "register")}>
        Registro
      </Link>
    </nav>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}
