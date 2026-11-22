import { prisma } from "@/lib/db";
import { assertSameOrigin, handle, json, readJson } from "@/lib/api/http";
import { clientIp, createSession } from "@/lib/auth/session";
import { assertRateLimit } from "@/lib/utils/rate-limit";
import { authenticate } from "@/modules/auth/application/auth";
import { loginSchema } from "@/modules/auth/domain/schemas";

/** POST /api/v1/auth/login — { email, password } → sets the HttpOnly session cookie. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = loginSchema.parse(await readJson(request));
    assertRateLimit(`login:${await clientIp()}:${body.email}`, 5, 10 * 60_000);
    const user = await authenticate(prisma, body.email, body.password);
    await createSession(user.id);
    return json({ id: user.id, role: user.role });
  });
}
