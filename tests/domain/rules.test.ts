import { describe, expect, it } from "vitest";
import { DomainError } from "@/lib/utils/errors";
import { meetingUrlSchema, nextStatus, type BookingAction } from "@/modules/bookings/domain/booking";
import { registerSchema } from "@/modules/auth/domain/schemas";
import { reviewSchema, summarizeRatings } from "@/modules/reviews/domain/review";
import { parseSearchParams, tutorProfileSchema } from "@/modules/tutors/domain/tutor";
import { detectImageType } from "@/modules/users/domain/profile";

const now = new Date("2026-11-20T12:00:00Z");
const future = new Date("2026-11-25T12:00:00Z");
const past = new Date("2026-11-10T12:00:00Z");
const tutor = { id: "t1", role: "TUTOR" as const };
const student = { id: "s1", role: "STUDENT" as const };
const otherTutor = { id: "t2", role: "TUTOR" as const };
const admin = { id: "a1", role: "ADMIN" as const };
const booking = (status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED", startAt = future) => ({ status, startAt, studentId: "s1", tutorId: "t1" });

const expectError = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  throw new Error("expected a DomainError");
};

describe("booking state machine", () => {
  it("lets the owning tutor accept or reject pending requests", () => {
    expect(nextStatus(booking("PENDING"), "accept", tutor, now)).toBe("ACCEPTED");
    expect(nextStatus(booking("PENDING"), "reject", tutor, now)).toBe("REJECTED");
  });

  it.each<[string, { id: string; role: "TUTOR" | "STUDENT" | "ADMIN" }]>([
    ["another tutor", otherTutor],
    ["the student", student],
    ["an admin", admin],
  ])("forbids %s from accepting", (_, actor) => {
    expectError(() => nextStatus(booking("PENDING"), "accept", actor, now), "FORBIDDEN");
  });

  it("refuses to answer twice or after the start time", () => {
    expectError(() => nextStatus(booking("ACCEPTED"), "accept", tutor, now), "CONFLICT");
    expectError(() => nextStatus(booking("PENDING", past), "accept", tutor, now), "CONFLICT");
  });

  it("lets either participant cancel before the start", () => {
    expect(nextStatus(booking("PENDING"), "cancel", student, now)).toBe("CANCELLED");
    expect(nextStatus(booking("ACCEPTED"), "cancel", tutor, now)).toBe("CANCELLED");
    expectError(() => nextStatus(booking("ACCEPTED", past), "cancel", student, now), "CONFLICT");
    expectError(() => nextStatus(booking("COMPLETED"), "cancel", student, now), "CONFLICT");
    expectError(() => nextStatus(booking("PENDING"), "cancel", { id: "s9", role: "STUDENT" }, now), "FORBIDDEN");
  });

  it("completes only accepted sessions that already happened, by the tutor", () => {
    expect(nextStatus(booking("ACCEPTED", past), "complete", tutor, now)).toBe("COMPLETED");
    expectError(() => nextStatus(booking("ACCEPTED"), "complete", tutor, now), "CONFLICT");
    expectError(() => nextStatus(booking("PENDING", past), "complete", tutor, now), "CONFLICT");
    expectError(() => nextStatus(booking("ACCEPTED", past), "complete", student, now), "FORBIDDEN");
  });

  it("never allows leaving terminal states", () => {
    const actions: BookingAction[] = ["accept", "reject", "cancel"];
    for (const status of ["REJECTED", "CANCELLED", "COMPLETED"] as const) {
      for (const action of actions) expectError(() => nextStatus(booking(status), action, tutor, now), "CONFLICT");
    }
  });
});

describe("validation schemas", () => {
  it("accepts only https meeting links", () => {
    expect(meetingUrlSchema.safeParse("https://meet.google.com/abc-defg-hij").success).toBe(true);
    expect(meetingUrlSchema.safeParse("http://zoom.us/j/1").success).toBe(false);
    expect(meetingUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("never lets self-registration create admins and requires adult tutors", () => {
    const base = { firstName: "A", lastName: "B", email: "a@b.co", password: "abc12345", age: 16, sex: "OTHER" };
    expect(registerSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: "TUTOR" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: "STUDENT" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, role: "STUDENT", password: "abcdefgh" }).success).toBe(false);
  });

  it("keeps review ratings within 1–5", () => {
    expect(reviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 3.5 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, comment: "Bien" }).success).toBe(true);
  });

  it("derives rating averages", () => {
    expect(summarizeRatings([])).toEqual({ average: null, count: 0 });
    expect(summarizeRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
  });

  it("requires a zone for in-person tutors", () => {
    const base = { bio: "x".repeat(40), subjectIds: ["a"], levelIds: ["b"], offersVirtual: false, offersInPerson: true, zone: null };
    expect(tutorProfileSchema.safeParse(base).success).toBe(false);
    expect(tutorProfileSchema.safeParse({ ...base, zone: "Centro" }).success).toBe(true);
    expect(tutorProfileSchema.safeParse({ ...base, offersInPerson: false }).success).toBe(false);
  });

  it("parses search params leniently", () => {
    const f = parseSearchParams({ subjects: ["fisica", "quimica"], minRating: "9", modality: "nope", page: "-3" });
    expect(f).toMatchObject({ subjects: ["fisica", "quimica"], minRating: 0, modality: "all", page: 1, sort: "rating" });
  });

  it("detects images from magic bytes, not names", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
