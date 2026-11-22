import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Avatars live outside `public/` (files added after build are not served from there)
 * and are streamed by /api/v1/users/[id]/avatar.
 */
const ROOT = path.join(process.cwd(), "storage", "avatars");
const SAFE_NAME = /^[a-z0-9]+-[a-f0-9]{12}\.(png|jpg|webp)$/;

export const AVATAR_MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

export async function saveAvatar(userId: string, bytes: Uint8Array, ext: keyof typeof AVATAR_MIME): Promise<string> {
  await mkdir(ROOT, { recursive: true });
  const name = `${userId.toLowerCase().replace(/[^a-z0-9]/g, "")}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(ROOT, name), bytes);
  return name;
}

export async function readAvatar(name: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!SAFE_NAME.test(name)) return null;
  try {
    const bytes = await readFile(path.join(ROOT, name));
    const ext = name.split(".").pop() as keyof typeof AVATAR_MIME;
    return { bytes, mime: AVATAR_MIME[ext] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteAvatar(name: string): Promise<void> {
  if (!SAFE_NAME.test(name)) return;
  try {
    await unlink(path.join(ROOT, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[avatar] delete failed", error);
  }
}
