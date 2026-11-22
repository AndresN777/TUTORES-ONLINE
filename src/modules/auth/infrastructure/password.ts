import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP-recommended parameters (19 MiB memory, 2 iterations).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch (error) {
    console.error("[auth] password verification failed", error);
    return false;
  }
}

/**
 * Hash checked when the email does not exist, so login takes the same time
 * whether or not the account exists (prevents user enumeration by timing).
 */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hash("dummy-password-for-timing", OPTIONS);
  return dummyHash;
}
