import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError, HTTP_STATUS } from "@/lib/utils/errors";
import { env } from "@/lib/env";

type ErrorBody = { error: { code: string; message: string; fields?: Record<string, string> } };

export function json<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(code: string, message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json<ErrorBody>({ error: { code, message, ...(fields ? { fields } : {}) } }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Wraps a route handler: maps domain/validation errors to a consistent JSON shape
 * and hides unexpected errors (logged server-side, never sent to the client).
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DomainError) return errorResponse(error.code, error.message, HTTP_STATUS[error.code]);
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const i of error.issues) fields[i.path.join(".") || "body"] ??= i.message;
      return errorResponse("VALIDATION", "Datos inválidos.", 400, fields);
    }
    console.error("[api] unexpected error", error);
    return errorResponse("INTERNAL", "Ocurrió un error inesperado.", 500);
  }
}

/**
 * CSRF defense for cookie-authenticated mutations: browsers always send Origin on
 * cross-site POST/PATCH, so a foreign origin is rejected. Clients without cookies
 * (no Origin header) are unaffected because they cannot ride the user's session.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([new URL(env.APP_URL).origin, new URL(request.url).origin]);
  if (!allowed.has(origin)) throw new DomainError("FORBIDDEN", "Origen no permitido.");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DomainError("VALIDATION", "El cuerpo debe ser JSON válido.");
  }
}
