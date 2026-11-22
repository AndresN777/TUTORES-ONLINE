import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { localDateOf } from "@/lib/utils/time";
import { PageHeader } from "@/components/shared/PageHeader";
import { getAvailability } from "@/modules/availability/application/availability";
import { AvailabilityEditor } from "@/modules/availability/presentation/AvailabilityEditor";

export const metadata: Metadata = { title: "Disponibilidad" };

export default async function AvailabilityPage() {
  const user = await requireRolePage("TUTOR");
  const a = await getAvailability(prisma, user.id);
  return (
    <>
      <PageHeader title="Disponibilidad" />
      <AvailabilityEditor
        timezone={a.timezone}
        slotMinutes={a.slotMinutes}
        slots={a.slots}
        exceptions={a.exceptions}
        booked={a.booked}
        today={localDateOf(new Date(), a.timezone)}
      />
    </>
  );
}
