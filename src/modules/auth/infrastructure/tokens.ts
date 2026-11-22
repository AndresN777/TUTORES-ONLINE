import { createHash, randomBytes } from "node:crypto";

/** 256-bit random token for cookies and reset links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this digest is persisted, so a leaked database cannot be replayed as sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
