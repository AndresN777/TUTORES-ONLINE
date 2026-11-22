import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, json } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { getPublicTutor } from "@/modules/tutors/application/tutors";
import { getWeekSlots } from "@/modules/availability/application/availability";

/** GET /api/v1/tutors/:id/slots?week=0 — bookable slots (UTC) of one week. */
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser("STUDENT");
    const { id } = await params;
    await getPublicTutor(prisma, id); // 404 for unknown or unapproved tutors
    const week = Number.parseInt(request.nextUrl.searchParams.get("week") ?? "0", 10);
    const data = await getWeekSlots(prisma, id, Number.isNaN(week) ? 0 : week);
    return json({
      weekStart: data.weekStart,
      timezone: data.timezone,
      slotMinutes: data.slotMinutes,
      slots: data.slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString(), available: s.available })),
    });
  });
}
