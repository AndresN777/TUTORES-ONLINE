import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin, handle, json, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { acceptBooking, cancelBooking, completeBooking, rejectBooking, updateMeetingDetails } from "@/modules/bookings/application/bookings";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), meetingUrl: z.string().optional(), meetingPlace: z.string().optional() }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("update-meeting"), meetingUrl: z.string().optional(), meetingPlace: z.string().optional() }),
]);

/**
 * PATCH /api/v1/bookings/:id — state transitions only through explicit actions:
 * accept | reject | complete | update-meeting (tutor), cancel (student or tutor).
 */
export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const { id } = await params;
    const body = bodySchema.parse(await readJson(request));
    const user = await requireUser("STUDENT", "TUTOR");
    switch (body.action) {
      case "accept":
        await acceptBooking(prisma, user, id, body);
        break;
      case "reject":
        await rejectBooking(prisma, user, id);
        break;
      case "cancel":
        await cancelBooking(prisma, user, id);
        break;
      case "complete":
        await completeBooking(prisma, user, id);
        break;
      case "update-meeting":
        await updateMeetingDetails(prisma, user, id, body);
        break;
    }
    const b = await prisma.booking.findUniqueOrThrow({ where: { id }, select: { id: true, status: true } });
    return json(b);
  });
}
