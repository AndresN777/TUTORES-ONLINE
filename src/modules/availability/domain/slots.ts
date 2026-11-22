import { z } from "zod";
import { SUPPORTED_TIMEZONES, addDays, weekdayOf, zonedToUtc } from "@/lib/utils/time";

export const SLOT_DURATIONS = [60, 90, 120] as const;
/** Tutoring blocks are offered between 8:00 and 20:00 local time. */
export const DAY_START_MINUTE = 8 * 60;
export const DAY_END_MINUTE = 20 * 60;
/** Students must request at least this long before the session starts. */
export const MIN_LEAD_MINUTES = 60;
export const BOOKING_WINDOW_WEEKS = 4;

export type WeeklySlot = { weekday: number; startMinute: number };
export type TimeRange = { startAt: Date; endAt: Date };

export type BookableSlot = TimeRange & {
  localDate: string;
  weekday: number;
  startMinute: number;
  available: boolean;
};

/** Start minutes of the grid rows for a given block duration. */
export function gridStartMinutes(slotMinutes: number): number[] {
  const rows: number[] = [];
  for (let m = DAY_START_MINUTE; m + slotMinutes <= DAY_END_MINUTE; m += slotMinutes) rows.push(m);
  return rows;
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export const availabilitySchema = z
  .object({
    timezone: z.enum(SUPPORTED_TIMEZONES.map((t) => t.id) as [string, ...string[]], {
      errorMap: () => ({ message: "Zona horaria no soportada." }),
    }),
    slotMinutes: z.coerce
      .number()
      .refine((v) => (SLOT_DURATIONS as readonly number[]).includes(v), "Duración no válida."),
    slots: z
      .array(z.object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int() }))
      .max(7 * 24),
    exceptions: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.")).max(120),
  })
  .superRefine((v, ctx) => {
    const allowed = new Set(gridStartMinutes(v.slotMinutes));
    v.slots.forEach((s, i) => {
      if (!allowed.has(s.startMinute)) {
        ctx.addIssue({ code: "custom", path: ["slots", i], message: "Un bloque no coincide con la duración elegida." });
      }
    });
  });

export type AvailabilityInput = z.infer<typeof availabilitySchema>;

/**
 * Expands weekly availability into concrete slots for the 7 days starting at
 * `weekStart` (a Monday, in the tutor's timezone), marking which can be requested.
 */
export function buildWeekSlots(params: {
  weekStart: string;
  slots: WeeklySlot[];
  exceptions: string[];
  slotMinutes: number;
  timeZone: string;
  busy: TimeRange[];
  now: Date;
}): BookableSlot[] {
  const { weekStart, slots, exceptions, slotMinutes, timeZone, busy, now } = params;
  const earliest = new Date(now.getTime() + MIN_LEAD_MINUTES * 60000);
  const blocked = new Set(exceptions);
  const result: BookableSlot[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const localDate = addDays(weekStart, offset);
    const weekday = weekdayOf(localDate);
    const daySlots = slots.filter((s) => s.weekday === weekday).sort((a, b) => a.startMinute - b.startMinute);
    for (const s of daySlots) {
      const startAt = zonedToUtc(localDate, s.startMinute, timeZone);
      const endAt = new Date(startAt.getTime() + slotMinutes * 60000);
      const range = { startAt, endAt };
      const available = !blocked.has(localDate) && startAt >= earliest && !busy.some((b) => overlaps(range, b));
      result.push({ ...range, localDate, weekday, startMinute: s.startMinute, available });
    }
  }
  return result;
}
