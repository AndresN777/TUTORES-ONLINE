import { DomainError } from "./errors";

/**
 * Fixed-window, in-memory limiter. Good enough for a single Node process (the
 * academic deployment); a multi-instance deployment needs a shared store (e.g. Redis).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): void {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new DomainError("RATE_LIMITED", "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
