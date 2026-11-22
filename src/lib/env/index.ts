import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  APP_URL: z.string().url("APP_URL debe ser una URL completa"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast at boot: a misconfigured environment must never serve requests.
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Variables de entorno inválidas: ${issues}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
