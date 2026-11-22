import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { searchTutors } from "@/modules/tutors/application/tutors";
import { parseSearchParams } from "@/modules/tutors/domain/tutor";

/** GET /api/v1/tutors?q=&subjects=fisica&minRating=4&modality=VIRTUAL&zone=&level=&weekday=&sort=rating&page=1 */
export function GET(request: NextRequest) {
  return handle(async () => {
    await requireUser("STUDENT", "ADMIN");
    const params: Record<string, string | string[]> = {};
    for (const key of new Set(request.nextUrl.searchParams.keys())) {
      const all = request.nextUrl.searchParams.getAll(key);
      params[key] = all.length > 1 ? all : all[0];
    }
    return json(await searchTutors(prisma, parseSearchParams(params)));
  });
}
