import { z } from "zod";

export const SEX_OPTIONS = [
  { value: "FEMALE", label: "Femenino" },
  { value: "MALE", label: "Masculino" },
  { value: "OTHER", label: "Otro" },
  { value: "UNDISCLOSED", label: "Prefiero no decirlo" },
] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Ingresa un correo electrónico válido.");

export const passwordSchema = z
  .string()
  .min(8, "Usa mínimo 8 caracteres con letras y números.")
  .max(128, "La contraseña es demasiado larga.")
  .regex(/[A-Za-z]/, "Usa mínimo 8 caracteres con letras y números.")
  .regex(/\d/, "Usa mínimo 8 caracteres con letras y números.");

export const nameSchema = (label: string) =>
  z.string().trim().min(1, `Ingresa tus ${label}.`).max(60, `Tus ${label} son demasiado largos.`);

export const ageSchema = z.coerce
  .number({ invalid_type_error: "Edad entre 12 y 99 años." })
  .int("Edad entre 12 y 99 años.")
  .min(12, "Edad entre 12 y 99 años.")
  .max(99, "Edad entre 12 y 99 años.");

export const sexSchema = z.enum(["FEMALE", "MALE", "OTHER", "UNDISCLOSED"], {
  errorMap: () => ({ message: "Selecciona una opción." }),
});

/** Self-registration never creates ADMIN accounts. */
export const registerSchema = z
  .object({
    role: z.enum(["STUDENT", "TUTOR"]),
    firstName: nameSchema("nombres"),
    lastName: nameSchema("apellidos"),
    email: emailSchema,
    password: passwordSchema,
    age: ageSchema,
    sex: sexSchema,
  })
  .refine((v) => v.role !== "TUTOR" || v.age >= 18, {
    path: ["age"],
    message: "Los profesores deben ser mayores de edad.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña.").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** Flattens Zod issues into { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
