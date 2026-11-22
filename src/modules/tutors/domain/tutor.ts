import { z } from "zod";

/** City sectors offered for in-person tutoring. Only the sector is public, never an address. */
export const ZONES = ["Centro", "Norte", "Sur", "Este", "Oeste"] as const;

export const SEARCH_PAGE_SIZE = 6;

export const tutorProfileSchema = z
  .object({
    bio: z.string().trim().min(30, "Describe tu experiencia en al menos 30 caracteres.").max(500, "La descripción admite hasta 500 caracteres."),
    subjectIds: z.array(z.string().min(1)).min(1, "Elige al menos una materia.").max(10),
    levelIds: z.array(z.string().min(1)).min(1, "Elige al menos un nivel.").max(10),
    offersVirtual: z.boolean(),
    offersInPerson: z.boolean(),
    zone: z.enum(ZONES).nullable(),
  })
  .refine((v) => v.offersVirtual || v.offersInPerson, { path: ["modes"], message: "Elige al menos una modalidad." })
  .refine((v) => !v.offersInPerson || v.zone !== null, { path: ["zone"], message: "Indica tu zona para tutorías presenciales." });

export type TutorProfileInput = z.infer<typeof tutorProfileSchema>;

export const searchSchema = z.object({
  q: z.string().trim().max(60).optional().default(""),
  subjects: z.array(z.string().max(40)).max(20).optional().default([]),
  minRating: z.coerce.number().refine((v) => [0, 3.5, 4, 4.5].includes(v)).catch(0).default(0),
  modality: z.enum(["all", "VIRTUAL", "IN_PERSON"]).catch("all").default("all"),
  zone: z.enum(ZONES).optional().catch(undefined),
  level: z.string().max(40).optional().catch(undefined),
  weekday: z.coerce.number().int().min(0).max(6).optional().catch(undefined),
  sort: z.enum(["rating", "name"]).catch("rating").default("rating"),
  page: z.coerce.number().int().min(1).max(1000).catch(1).default(1),
});

export type SearchFilters = z.infer<typeof searchSchema>;

/** Parses URL search params (repeated `subjects`) leniently: bad values fall back to defaults. */
export function parseSearchParams(params: Record<string, string | string[] | undefined>): SearchFilters {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) || undefined;
  const subjects = params.subjects === undefined ? [] : ([] as string[]).concat(params.subjects);
  return searchSchema.parse({
    q: one("q"),
    subjects,
    minRating: one("minRating"),
    modality: one("modality"),
    zone: one("zone"),
    level: one("level"),
    weekday: one("weekday"),
    sort: one("sort"),
    page: one("page"),
  });
}
