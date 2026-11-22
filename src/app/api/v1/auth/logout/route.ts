import { assertSameOrigin, handle, json } from "@/lib/api/http";
import { destroySession } from "@/lib/auth/session";

/** POST /api/v1/auth/logout — revokes the current session. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    await destroySession();
    return json({ ok: true });
  });
}
