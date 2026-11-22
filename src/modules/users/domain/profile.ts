import { z } from "zod";
import { ageSchema, emailSchema, nameSchema, passwordSchema, sexSchema } from "@/modules/auth/domain/schemas";

export const profileSchema = z.object({
  firstName: nameSchema("nombres"),
  lastName: nameSchema("apellidos"),
  email: emailSchema,
  // Empty means "keep the current password".
  password: z.union([z.literal(""), passwordSchema]).default(""),
  sex: sexSchema,
  age: ageSchema,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Detects the image type from its magic bytes; the client-declared MIME type is not trusted. */
export function detectImageType(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "webp";
  return null;
}
