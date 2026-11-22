import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { WEEKDAY_LABELS } from "@/lib/utils/time";
import { PageHeader } from "@/components/shared/PageHeader";
import { AutoSubmitForm, ClearFiltersButton } from "@/components/shared/AutoSubmitForm";
import { listActiveLevels, listActiveSubjects } from "@/modules/subjects/application/subjects";
import { searchTutors } from "@/modules/tutors/application/tutors";
import { ZONES, parseSearchParams, type SearchFilters } from "@/modules/tutors/domain/tutor";
import { TutorCardView } from "@/modules/tutors/presentation/TutorCardView";

export const metadata: Metadata = { title: "Buscar tutores" };

const RATINGS = [
  [0, "Cualquiera"],
  [4.5, "★ 4.5 +"],
  [4, "★ 4 +"],
  [3.5, "★ 3.5 +"],
] as const;
const MODES = [
  ["all", "Todas"],
  ["VIRTUAL", "Virtual"],
  ["IN_PERSON", "Presencial"],
] as const;
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function pageHref(f: SearchFilters, page: number) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  f.subjects.forEach((s) => p.append("subjects", s));
  if (f.minRating) p.set("minRating", String(f.minRating));
  if (f.modality !== "all") p.set("modality", f.modality);
  if (f.zone) p.set("zone", f.zone);
  if (f.level) p.set("level", f.level);
  if (f.weekday !== undefined) p.set("weekday", String(f.weekday));
  if (f.sort !== "rating") p.set("sort", f.sort);
  p.set("page", String(page));
  return `/student/search?${p.toString()}`;
}

const legend = "mb-1.5 text-[15px] text-accent-text uppercase";
const option = "flex min-h-9 cursor-pointer items-center gap-3 text-[17px] text-ink-soft";
const control = "h-[22px] w-[22px] accent-[var(--color-accent)]";
const select = "min-h-10 border-0 bg-field px-2 text-base text-ink";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRolePage("STUDENT");
  const f = parseSearchParams(await searchParams);
  const [subjects, levels, result] = await Promise.all([listActiveSubjects(prisma), listActiveLevels(prisma), searchTutors(prisma, f)]);
  const anyFilter = !!(f.q || f.subjects.length || f.minRating || f.modality !== "all" || f.level || f.weekday !== undefined);

  return (
    <>
      <PageHeader title="Buscar tutores" />
      <AutoSubmitForm action="/student/search" className="flex flex-wrap items-start gap-8">
        <aside aria-labelledby="filters-h" className="flex max-w-[280px] flex-[1_1_240px] flex-col gap-2.5">
          <h2 id="filters-h" className="section-title">Filtros</h2>
          <div className="flex flex-col gap-5 border-4 border-ink px-4.5 py-4">
            <label className="flex flex-col gap-1.5 text-[15px] text-accent-text">
              NOMBRE
              <input type="search" name="q" defaultValue={f.q} placeholder="Buscar por nombre" className="min-h-10 border-0 bg-field px-2.5 text-base text-ink placeholder:text-muted" />
            </label>
            <fieldset className="m-0 border-0 p-0">
              <legend className={legend}>Materia</legend>
              {subjects.map((s) => (
                <label key={s.id} className={option}>
                  <input type="checkbox" name="subjects" value={s.slug} defaultChecked={f.subjects.includes(s.slug)} className={control} />
                  {s.name}
                </label>
              ))}
            </fieldset>
            <fieldset className="m-0 border-0 p-0">
              <legend className={legend}>Puntuación mínima</legend>
              {RATINGS.map(([v, label]) => (
                <label key={v} className={option}>
                  <input type="radio" name="minRating" value={v === 0 ? "" : v} defaultChecked={f.minRating === v} className={control} />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset className="m-0 border-0 p-0">
              <legend className={legend}>Modalidad</legend>
              {MODES.map(([v, label]) => (
                <label key={v} className={option}>
                  <input type="radio" name="modality" value={v === "all" ? "" : v} defaultChecked={f.modality === v} className={control} />
                  {label}
                </label>
              ))}
            </fieldset>
            {f.modality === "IN_PERSON" && (
              <label className="flex flex-col gap-1.5 text-[15px] text-accent-text">
                ZONA (PRESENCIAL)
                <select name="zone" defaultValue={f.zone ?? ""} className={select}>
                  <option value="">Todas las zonas</option>
                  {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-[15px] text-accent-text">
              NIVEL EDUCATIVO
              <select name="level" defaultValue={f.level ?? ""} className={select}>
                <option value="">Todos los niveles</option>
                {levels.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[15px] text-accent-text">
              DISPONIBLE EL DÍA
              <select name="weekday" defaultValue={f.weekday ?? ""} className={select}>
                <option value="">Cualquier día</option>
                {WEEKDAY_LABELS.map((_, i) => <option key={i} value={i}>{DAY_NAMES[i]}</option>)}
              </select>
            </label>
            <noscript>
              <button type="submit" className="btn-dark w-full">Aplicar filtros</button>
            </noscript>
            {anyFilter && <ClearFiltersButton className="btn-outline">Limpiar filtros</ClearFiltersButton>}
          </div>
        </aside>

        <section aria-labelledby="results-h" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-h" role="status" className="section-title">
              {result.total === 1 ? "1 tutor encontrado" : `${result.total} tutores encontrados`}
            </h2>
            <label className="flex items-center gap-2.5 text-base">
              Ordenar por
              <select name="sort" defaultValue={f.sort} className={select}>
                <option value="rating">Mejor puntuación</option>
                <option value="name">Nombre (A–Z)</option>
              </select>
            </label>
          </div>
          {result.total === 0 ? (
            <div className="flex flex-col items-center gap-3 border-2 border-dashed border-[#9AA1AB] px-6 py-12 text-center">
              <p className="m-0 text-[22px]">No encontramos tutores con esos filtros</p>
              <p className="m-0 text-muted">Prueba con otra materia, una puntuación menor u otra modalidad.</p>
              <ClearFiltersButton className="btn-accent">Limpiar filtros</ClearFiltersButton>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-6">
                {result.items.map((t) => <TutorCardView key={t.id} tutor={t} />)}
              </div>
              {result.pageCount > 1 && (
                <nav aria-label="Paginación" className="mt-2 flex items-center justify-center gap-4">
                  {result.page > 1 ? <Link href={pageHref(f, result.page - 1)} className="btn-outline min-w-28">Anterior</Link> : <span className="btn-outline min-w-28 opacity-50" aria-disabled="true">Anterior</span>}
                  <span>Página {result.page} de {result.pageCount}</span>
                  {result.page < result.pageCount ? <Link href={pageHref(f, result.page + 1)} className="btn-outline min-w-28">Siguiente</Link> : <span className="btn-outline min-w-28 opacity-50" aria-disabled="true">Siguiente</span>}
                </nav>
              )}
            </>
          )}
        </section>
      </AutoSubmitForm>
    </>
  );
}
