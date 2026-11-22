/**
 * Timezone helpers built on Intl only. Dates are stored in UTC; availability is
 * defined in the tutor's local time, and everything is formatted in the viewer's zone.
 */

export const DEFAULT_TIMEZONE = "America/Santo_Domingo";

export const SUPPORTED_TIMEZONES = [
  { id: "America/Santo_Domingo", label: "America/Santo_Domingo (UTC−4)" },
  { id: "America/Bogota", label: "America/Bogota (UTC−5)" },
  { id: "America/Mexico_City", label: "America/Mexico_City (UTC−6)" },
  { id: "Europe/Madrid", label: "Europe/Madrid (UTC+1/+2)" },
] as const;

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Offset (minutes) of `timeZone` relative to UTC at the given instant. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** Converts a local date (YYYY-MM-DD) + minutes from midnight in `timeZone` to a UTC Date. */
export function zonedToUtc(localDate: string, minuteOfDay: number, timeZone: string): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minuteOfDay);
  const first = guess - tzOffsetMinutes(new Date(guess), timeZone) * 60000;
  // Re-check at the candidate instant so DST transitions resolve correctly.
  return new Date(guess - tzOffsetMinutes(new Date(first), timeZone) * 60000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date (YYYY-MM-DD) of an instant in `timeZone`. */
export function localDateOf(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes from local midnight of an instant in `timeZone`. */
export function localMinuteOf(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD calendar date. */
export function weekdayOf(localDate: string): number {
  const [y, m, d] = localDate.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Monday (YYYY-MM-DD) of the week containing `localDate`. */
export function mondayOf(localDate: string): string {
  return addDays(localDate, -weekdayOf(localDate));
}

/** "DD-MM-YYYY", the date format used across the UI. */
export function formatDate(date: Date, timeZone: string): string {
  return displayLocalDate(localDateOf(date, timeZone));
}

export function displayLocalDate(localDate: string): string {
  return localDate.split("-").reverse().join("-");
}

/** "4:00 PM" */
export function formatTime(date: Date, timeZone: string): string {
  return formatMinute(localMinuteOf(date, timeZone));
}

export function formatMinute(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}
