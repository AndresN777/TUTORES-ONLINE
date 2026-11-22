import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/lib/utils/errors";
import { assertRateLimit, resetRateLimits } from "@/lib/utils/rate-limit";
import { authenticate, registerUser, requestPasswordReset, resetPassword } from "@/modules/auth/application/auth";
import type { EmailMessage, EmailProvider } from "@/modules/notifications/infrastructure/email";
import { decideVerification } from "@/modules/tutors/application/tutors";
import { moderateReview, reportReview } from "@/modules/reviews/application/reviews";
import { setUserStatus, updateProfile } from "@/modules/users/application/users";
import { createAdmin, createStudent, createSubject, createTutor, db, resetDb } from "../helpers/db";

class SpyMailer implements EmailProvider {
  sent: EmailMessage[] = [];
  async send(m: EmailMessage) {
    this.sent.push(m);
    return { delivered: false, provider: "spy" };
  }
}

const input = { role: "STUDENT" as const, firstName: "Ana", lastName: "Pérez", email: "ana@test.dev", password: "secreta123", age: 20, sex: "FEMALE" as const };

async function code(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    return (e as DomainError).code;
  }
  throw new Error("expected a DomainError");
}

beforeEach(async () => {
  await resetDb();
  resetRateLimits();
});

describe("authentication", () => {
  it("registers with a hashed password and authenticates", async () => {
    const user = await registerUser(db, input);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toContain("secreta123");
    expect(stored.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await authenticate(db, input.email, input.password)).toEqual({ id: user.id, role: "STUDENT" });
  });

  it("gives the same error for wrong password and unknown email", async () => {
    await registerUser(db, input);
    const wrong = await authenticate(db, input.email, "otra12345").catch((e: Error) => e.message);
    const unknown = await authenticate(db, "nadie@test.dev", "otra12345").catch((e: Error) => e.message);
    expect(wrong).toBe(unknown);
  });

  it("creates tutors with a pending profile and rejects duplicate emails", async () => {
    const t = await registerUser(db, { ...input, role: "TUTOR", email: "t@test.dev" });
    expect((await db.tutorProfile.findUniqueOrThrow({ where: { userId: t.id } })).verification).toBe("PENDING");
    expect(await code(registerUser(db, input).then(() => registerUser(db, input)))).toBe("CONFLICT");
  });

  it("blocks suspended accounts from signing in", async () => {
    const u = await registerUser(db, input);
    await db.user.update({ where: { id: u.id }, data: { status: "SUSPENDED" } });
    expect(await code(authenticate(db, input.email, input.password))).toBe("FORBIDDEN");
  });

  it("resets passwords with a single-use token without revealing unknown emails", async () => {
    const mailer = new SpyMailer();
    await requestPasswordReset(db, "nadie@test.dev", mailer, "http://x");
    expect(mailer.sent).toHaveLength(0);
    const u = await registerUser(db, input);
    await db.session.create({ data: { id: "s", userId: u.id, expiresAt: new Date(Date.now() + 1e6) } });
    await requestPasswordReset(db, input.email, mailer, "http://x");
    const token = decodeURIComponent(mailer.sent[0].text.match(/token=([^\s]+)/)![1]);
    await resetPassword(db, token, "nueva12345");
    expect(await authenticate(db, input.email, "nueva12345")).toMatchObject({ id: u.id });
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect(await code(resetPassword(db, token, "otra12345"))).toBe("VALIDATION");
  });

  it("rate-limits repeated attempts", () => {
    for (let i = 0; i < 5; i++) assertRateLimit("login:x", 5, 60_000, 0);
    expect(() => assertRateLimit("login:x", 5, 60_000, 0)).toThrow(DomainError);
    expect(() => assertRateLimit("login:x", 5, 60_000, 61_000)).not.toThrow();
  });
});

describe("profiles", () => {
  it("keeps emails unique and tutors adult when editing", async () => {
    const a = await createStudent();
    const b = await createStudent();
    const base = { firstName: "X", lastName: "Y", password: "", sex: "OTHER" as const, age: 20 };
    expect(await code(updateProfile(db, a.id, { ...base, email: b.email }))).toBe("CONFLICT");
    const subject = await createSubject();
    const tutor = await createTutor(subject.id);
    expect(await code(updateProfile(db, tutor.id, { ...base, email: tutor.email, age: 16 }))).toBe("VALIDATION");
  });
});

describe("administration", () => {
  it("suspends accounts, revokes their sessions, and is admin-only", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    await db.session.create({ data: { id: "x", userId: student.id, expiresAt: new Date(Date.now() + 1e6) } });
    expect(await code(setUserStatus(db, student.actor, admin.id, "SUSPENDED"))).toBe("FORBIDDEN");
    expect(await code(setUserStatus(db, admin.actor, admin.id, "SUSPENDED"))).toBe("VALIDATION");
    await setUserStatus(db, admin.actor, student.id, "SUSPENDED");
    expect((await db.user.findUniqueOrThrow({ where: { id: student.id } })).status).toBe("SUSPENDED");
    expect(await db.session.count({ where: { userId: student.id } })).toBe(0);
  });

  it("verifies tutors once and only by admins", async () => {
    const admin = await createAdmin();
    const subject = await createSubject();
    const tutor = await createTutor(subject.id, { verification: "PENDING" });
    expect(await code(decideVerification(db, tutor.actor, tutor.id, true))).toBe("FORBIDDEN");
    await decideVerification(db, admin.actor, tutor.id, true);
    expect((await db.tutorProfile.findUniqueOrThrow({ where: { userId: tutor.id } })).verification).toBe("APPROVED");
    expect(await code(decideVerification(db, admin.actor, tutor.id, true))).toBe("CONFLICT");
  });

  it("lets tutors report reviews about themselves and admins hide them without editing ratings", async () => {
    const admin = await createAdmin();
    const subject = await createSubject();
    const tutor = await createTutor(subject.id);
    const other = await createTutor(subject.id);
    const student = await createStudent();
    const booking = await db.booking.create({
      data: { studentId: student.id, tutorId: tutor.id, subjectId: subject.id, startAt: new Date("2026-01-01T10:00:00Z"), endAt: new Date("2026-01-01T11:00:00Z"), modality: "VIRTUAL", status: "COMPLETED" },
    });
    const review = await db.review.create({ data: { bookingId: booking.id, studentId: student.id, tutorId: tutor.id, rating: 1, comment: "ofensivo" } });
    expect(await code(reportReview(db, other.actor, review.id, "No es cierto"))).toBe("FORBIDDEN");
    await reportReview(db, tutor.actor, review.id, "Lenguaje ofensivo");
    expect(await code(moderateReview(db, tutor.actor, review.id, "hide"))).toBe("FORBIDDEN");
    await moderateReview(db, admin.actor, review.id, "hide");
    const hidden = await db.review.findUniqueOrThrow({ where: { id: review.id } });
    expect(hidden).toMatchObject({ status: "HIDDEN", rating: 1, reportedAt: null });
  });
});
