export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true" className="h-16 w-64 animate-pulse bg-field" />
      <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        <div className="h-64 animate-pulse bg-field" />
        <div className="h-64 animate-pulse bg-field" />
      </div>
    </div>
  );
}
