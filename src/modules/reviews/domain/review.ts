import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce
    .number({ invalid_type_error: "Elige de 1 a 5 estrellas." })
    .int("Elige de 1 a 5 estrellas.")
    .min(1, "Elige de 1 a 5 estrellas.")
    .max(5, "Elige de 1 a 5 estrellas."),
  comment: z.string().trim().max(500, "El comentario admite hasta 500 caracteres.").optional(),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(5, "Explica brevemente el motivo del reporte.").max(200),
});

export type RatingSummary = { average: number | null; count: number };

/** Ratings are always derived from published reviews, never stored, so they cannot drift. */
export function summarizeRatings(ratings: number[]): RatingSummary {
  if (ratings.length === 0) return { average: null, count: 0 };
  const sum = ratings.reduce((a, b) => a + b, 0);
  return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
}

export function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}
