import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { DomainError } from "@/lib/utils/errors";
import { generateToken, hashToken } from "@/modules/auth/infrastructure/tokens";

export const SESSION_COOKIE = "to_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  avatarFile: string | null;
};

export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user once per request. Suspended or expired accounts count as signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  const { id, role, firstName, lastName, email, timezone, avatarFile } = session.user;
  return { id, role, firstName, lastName, email, timezone, avatarFile };
});

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  TUTOR: "/tutor",
  ADMIN: "/admin",
};

/** For pages and layouts: redirects instead of throwing. */
export async function requireRolePage(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

/** For Server Actions and API routes: throws a DomainError the caller maps to a response. */
export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("UNAUTHENTICATED", "Debes iniciar sesión.");
  if (roles.length && !roles.includes(user.role)) {
    throw new DomainError("FORBIDDEN", "No tienes permiso para realizar esta acción.");
  }
  return user;
}

/** Best-effort client IP for rate limiting. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
