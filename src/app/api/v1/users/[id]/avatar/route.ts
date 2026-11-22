import { prisma } from "@/lib/db";
import { handle } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { DomainError } from "@/lib/utils/errors";
import { readAvatar } from "@/modules/users/infrastructure/avatar-storage";

/** GET /api/v1/users/:id/avatar — profile photo, visible to signed-in users only. */
export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { avatarFile: true } });
    const file = user?.avatarFile ? await readAvatar(user.avatarFile) : null;
    if (!file) throw new DomainError("NOT_FOUND", "Sin foto de perfil.");
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "private, max-age=86400",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  });
}
