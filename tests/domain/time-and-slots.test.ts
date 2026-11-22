import { describe, expect, it } from "vitest";
import { addDays, formatDate, formatTime, mondayOf, weekdayOf, zonedToUtc } from "@/lib/utils/time";
import { availabilitySchema, buildWeekSlots, gridStartMinutes, overlaps } from "@/modules/availability/domain/slots";

const TZ = "America/Santo_Domingo"; // UTC−4, no DST

describe("time helpers", () => {
  it("converts tutor-local time to UTC", () => {
    expect(zonedToUtc("2026-11-23", 16 * 60, TZ).toISOString()).toBe("2026-11-23T20:00:00.000Z");
  });

  it("handles DST zones on both sides of the change", () => {
    expect(zonedToUtc("2026-03-27", 10 * 60, "Europe/Madrid").toISOString()).toBe("2026-03-27T09:00:00.000Z");
    expect(zonedToUtc("2026-03-30", 10 * 60, "Europe/Madrid").toISOString()).toBe("2026-03-30T08:00:00.000Z");
  });

  it("formats dates and times as the UI expects", () => {
    const d = new Date("2026-11-23T20:00:00Z");
    expect(formatDate(d, TZ)).toBe("23-11-2026");
    expect(formatTime(d, TZ)).toBe("4:00 PM");
  });

  it("computes weekdays and Mondays", () => {
    expect(weekdayOf("2026-11-22")).toBe(6); // Sunday
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("weekly slots", () => {
  const base = {
    weekStart: "2026-11-23",
    slots: [
      { weekday: 0, startMinute: 540 },
      { weekday: 0, startMinute: 960 },
      { weekday: 2, startMinute: 540 },
    ],
    exceptions: [] as string[],
    slotMinutes: 60,
    timeZone: TZ,
    busy: [] as { startAt: Date; endAt: Date }[],
    now: new Date("2026-11-20T12:00:00Z"),
  };

  it("expands the weekly template into concrete UTC slots", () => {
    const slots = buildWeekSlots(base);
    expect(slots).toHaveLength(3);
    expect(slots[0].startAt.toISOString()).toBe("2026-11-23T13:00:00.000Z");
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("blocks exception days", () => {
    const slots = buildWeekSlots({ ...base, exceptions: ["2026-11-23"] });
    expect(slots.filter((s) => s.available).map((s) => s.localDate)).toEqual(["2026-11-25"]);
  });

  it("blocks slots overlapping an accepted session", () => {
    const busy = [{ startAt: new Date("2026-11-23T20:30:00Z"), endAt: new Date("2026-11-23T21:30:00Z") }];
    const slots = buildWeekSlots({ ...base, busy });
    expect(slots.find((s) => s.startMinute === 960 && s.weekday === 0)?.available).toBe(false);
  });

  it("blocks slots that start too soon or in the past", () => {
    const slots = buildWeekSlots({ ...base, now: new Date("2026-11-23T12:30:00Z") });
    expect(slots[0].available).toBe(false); // 13:00Z is less than 60 minutes away
    expect(slots[1].available).toBe(true);
  });

  it("detects overlaps but not touching ranges", () => {
    const a = { startAt: new Date("2026-01-01T10:00:00Z"), endAt: new Date("2026-01-01T11:00:00Z") };
    expect(overlaps(a, { startAt: new Date("2026-01-01T10:30:00Z"), endAt: new Date("2026-01-01T11:30:00Z") })).toBe(true);
    expect(overlaps(a, { startAt: new Date("2026-01-01T11:00:00Z"), endAt: new Date("2026-01-01T12:00:00Z") })).toBe(false);
  });

  it("validates availability against the grid of the chosen duration", () => {
    // 8:00 → 20:00 in 90-minute blocks; the last one (18:30–20:00) ends exactly at closing.
    expect(gridStartMinutes(90)).toEqual([480, 570, 660, 750, 840, 930, 1020, 1110]);
    const ok = availabilitySchema.safeParse({ timezone: TZ, slotMinutes: 90, slots: [{ weekday: 0, startMinute: 570 }], exceptions: [] });
    expect(ok.success).toBe(true);
    const bad = availabilitySchema.safeParse({ timezone: TZ, slotMinutes: 90, slots: [{ weekday: 0, startMinute: 540 }], exceptions: [] });
    expect(bad.success).toBe(false);
    const badTz = availabilitySchema.safeParse({ timezone: "Mars/Base", slotMinutes: 60, slots: [], exceptions: [] });
    expect(badTz.success).toBe(false);
  });
});
