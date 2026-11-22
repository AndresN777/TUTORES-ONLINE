import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="m-0 font-display text-7xl font-semibold text-student">404</h1>
      <p className="m-0 text-xl">No encontramos lo que buscas.</p>
      <Link href="/" className="btn bg-student text-white">Volver al inicio</Link>
    </main>
  );
}
