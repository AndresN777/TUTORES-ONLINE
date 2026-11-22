"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="m-0 font-display text-6xl font-semibold">Algo salió mal</h1>
      <p className="m-0 text-lg text-ink-soft">No pudimos cargar esta página. Intenta de nuevo en unos segundos.</p>
      <button type="button" onClick={reset} className="btn-dark">Reintentar</button>
    </main>
  );
}
