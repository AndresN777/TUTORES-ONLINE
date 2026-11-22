import { prisma } from "@/lib/db";
import { handle, json } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { getPublicTutor } from "@/modules/tutors/application/tutors";

/** GET /api/v1/tutors/:id — public profile of an approved tutor (no contact data). */
export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    return json(await getPublicTutor(prisma, id));
  });
}
