import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/lib/utils/errors";
import { acceptBooking, cancelBooking, completeBooking, createBooking, rejectBooking, updateMeetingDetails } from "@/modules/bookings/application/bookings";
import { createReview } from "@/modules/reviews/application/reviews";
import { getWeekSlots, saveAvailability } from "@/modules/availability/application/availability";
import { NOW, TZ, createStudent, createSubject, createTutor, db, resetDb, slotAt } from "../helpers/db";

const MEET = { meetingUrl: "https://meet.google.com/abc-defg-hij" };

async function expectDomainError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(DomainError);
  await promise.catch((e: DomainError) => expect(e.code).toBe(code));
}

async function setup() {
  const subject = await createSubject();
  const tutor = await createTutor(subject.id);
  const student = await createStudent();
  const request = (startAt = slotAt(1, 0, 540), who = student) =>
    createBooking(db, who.actor, { tutorId: tutor.id, subjectId: subject.id, modality: "VIRTUAL", startAt }, NOW);
  return { subject, tutor, student, request };
}

beforeEach(resetDb);

describe("creating bookings", () => {
  it("creates a pending request for a published slot and notifies the tutor", async () => {
    const { tutor, request } = await setup();
    const b = await request();
    expect(b.status).toBe("PENDING");
    expect(await db.notification.count({ where: { userId: tutor.id } })).toBe(1);
  });

  it("rejects times outside the tutor's availability", async () => {
    const { request } = await setup();
    await expectDomainError(request(slotAt(1, 0, 600)), "CONFLICT"); // 10:00 is not published
    await expectDomainError(request(slotAt(1, 5, 540)), "CONFLICT"); // Saturday is not published
  });

  it("rejects past slots and exception days", async () => {
    const { tutor, request } = await setup();
    await expectDomainError(request(slotAt(0, 0, 540)), "CONFLICT"); // Monday before NOW
    await db.availabilityException.create({ data: { tutorId: tutor.id, date: "2026-11-23" } });
    await expectDomainError(request(slotAt(1, 0, 540)), "CONFLICT");
  });

  it("prevents a student from holding two requests at the same time", async () => {
    const { request } = await setup();
    await request();
    await expectDomainError(request(), "CONFLICT");
  });

  it("only lets students book, never tutors for themselves", async () => {
    const { tutor, subject } = await setup();
    await expectDomainError(
      createBooking(db, tutor.actor, { tutorId: tutor.id, subjectId: subject.id, modality: "VIRTUAL", startAt: slotAt(1, 0, 540) }, NOW),
      "FORBIDDEN",
    );
  });

  it("refuses unverified tutors, untaught subjects and unoffered modalities", async () => {
    const { subject, student } = await setup();
    const pending = await createTutor(subject.id, { verification: "PENDING" });
    await expectDomainError(createBooking(db, student.actor, { tutorId: pending.id, subjectId: subject.id, modality: "VIRTUAL", startAt: slotAt(1, 0, 540) }, NOW), "NOT_FOUND");
    const approved = await createTutor(subject.id);
    const other = await createSubject("Química");
    await expectDomainError(createBooking(db, student.actor, { tutorId: approved.id, subjectId: other.id, modality: "VIRTUAL", startAt: slotAt(1, 0, 540) }, NOW), "VALIDATION");
    await expectDomainError(createBooking(db, student.actor, { tutorId: approved.id, subjectId: subject.id, modality: "IN_PERSON", startAt: slotAt(1, 0, 540) }, NOW), "VALIDATION");
  });
});

describe("double booking and responses", () => {
  it("accepting one request auto-declines competing requests for the same block", async () => {
    const { tutor, request } = await setup();
    const rival = await createStudent();
    const first = await request();
    const second = await request(slotAt(1, 0, 540), rival);
    await acceptBooking(db, tutor.actor, first.id, MEET, NOW);
    const after = await db.booking.findUniqueOrThrow({ where: { id: second.id } });
    expect(after.status).toBe("REJECTED");
    // The block is no longer offered to anyone.
    const week = await getWeekSlots(db, tutor.id, 1, NOW);
    expect(week.slots.find((s) => s.startAt.getTime() === first.startAt.getTime())?.available).toBe(false);
  });

  it("refuses to accept a request that overlaps an accepted session", async () => {
    const { tutor, student, subject } = await setup();
    const a = await createBooking(db, student.actor, { tutorId: tutor.id, subjectId: subject.id, modality: "VIRTUAL", startAt: slotAt(1, 0, 540) }, NOW);
    // Simulates data created before the guard (e.g. imported): a second pending booking on the same block.
    const rival = await createStudent();
    const b = await db.booking.create({ data: { studentId: rival.id, tutorId: tutor.id, subjectId: subject.id, startAt: a.startAt, endAt: a.endAt, modality: "VIRTUAL" } });
    await acceptBooking(db, tutor.actor, a.id, MEET, NOW);
    await db.booking.update({ where: { id: b.id }, data: { status: "PENDING" } });
    await expectDomainError(acceptBooking(db, tutor.actor, b.id, MEET, NOW), "CONFLICT");
  });

  it("enforces one accepted booking per tutor and start time at the database level", async () => {
    const { tutor, student, subject } = await setup();
    const data = { studentId: student.id, tutorId: tutor.id, subjectId: subject.id, startAt: slotAt(1, 0, 540), endAt: slotAt(1, 0, 600), modality: "VIRTUAL" as const, status: "ACCEPTED" as const };
    await db.booking.create({ data });
    await expect(db.booking.create({ data })).rejects.toThrow();
  });

  it("requires an https meeting link to accept a virtual session and stores only the link", async () => {
    const { tutor, request } = await setup();
    const b = await request();
    await expectDomainError(acceptBooking(db, tutor.actor, b.id, { meetingUrl: "http://insecure.dev" }, NOW), "VALIDATION");
    const ok = await acceptBooking(db, tutor.actor, b.id, MEET, NOW);
    expect(ok.meetingUrl).toBe(MEET.meetingUrl);
  });

  it("requires a meeting point for in-person sessions", async () => {
    const subject = await createSubject();
    const tutor = await createTutor(subject.id, { inPerson: true });
    const student = await createStudent();
    const b = await createBooking(db, student.actor, { tutorId: tutor.id, subjectId: subject.id, modality: "IN_PERSON", startAt: slotAt(1, 1, 540) }, NOW);
    await expectDomainError(acceptBooking(db, tutor.actor, b.id, {}, NOW), "VALIDATION");
    const ok = await acceptBooking(db, tutor.actor, b.id, { meetingPlace: "Biblioteca Central" }, NOW);
    expect(ok.meetingPlace).toBe("Biblioteca Central");
  });

  it("forbids another tutor or the student from answering", async () => {
    const { subject, student, request } = await setup();
    const b = await request();
    const intruder = await createTutor(subject.id);
    await expectDomainError(acceptBooking(db, intruder.actor, b.id, MEET, NOW), "FORBIDDEN");
    await expectDomainError(rejectBooking(db, intruder.actor, b.id, NOW), "FORBIDDEN");
    await expectDomainError(rejectBooking(db, student.actor as never, b.id, NOW), "FORBIDDEN");
  });

  it("lets only the owning tutor edit meeting details of upcoming accepted sessions", async () => {
    const { tutor, subject, request } = await setup();
    const b = await request();
    await expectDomainError(updateMeetingDetails(db, tutor.actor, b.id, MEET, NOW), "CONFLICT");
    await acceptBooking(db, tutor.actor, b.id, MEET, NOW);
    const intruder = await createTutor(subject.id);
    await expectDomainError(updateMeetingDetails(db, intruder.actor, b.id, MEET, NOW), "FORBIDDEN");
    await updateMeetingDetails(db, tutor.actor, b.id, { meetingUrl: "https://zoom.us/j/42" }, NOW);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).meetingUrl).toBe("https://zoom.us/j/42");
  });
});

describe("cancellation, completion and reviews", () => {
  it("lets the student cancel and notifies the tutor; a stranger cannot", async () => {
    const { tutor, student, request } = await setup();
    const b = await request();
    const stranger = await createStudent();
    await expectDomainError(cancelBooking(db, stranger.actor, b.id, NOW), "FORBIDDEN");
    await cancelBooking(db, student.actor, b.id, NOW);
    const after = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(after).toMatchObject({ status: "CANCELLED", cancelledBy: student.id });
    expect(await db.notification.count({ where: { userId: tutor.id } })).toBe(2);
  });

  it("completes past sessions and allows exactly one review by the right student", async () => {
    const { tutor, student, request } = await setup();
    const b = await request();
    await acceptBooking(db, tutor.actor, b.id, MEET, NOW);
    await expectDomainError(createReview(db, student.actor, b.id, { rating: 5 }), "CONFLICT"); // not completed yet
    const later = new Date(b.startAt.getTime() + 2 * 3600_000);
    await completeBooking(db, tutor.actor, b.id, later);
    const stranger = await createStudent();
    await expectDomainError(createReview(db, stranger.actor, b.id, { rating: 5 }), "FORBIDDEN");
    await createReview(db, student.actor, b.id, { rating: 4, comment: "Muy bien" });
    await expectDomainError(createReview(db, student.actor, b.id, { rating: 5 }), "CONFLICT");
  });
});

describe("availability", () => {
  it("replaces the weekly template atomically and keeps existing bookings", async () => {
    const { tutor, request } = await setup();
    const b = await request();
    await saveAvailability(db, tutor.id, { timezone: TZ, slotMinutes: 90, slots: [{ weekday: 5, startMinute: 570 }], exceptions: ["2026-12-24"] });
    const slots = await db.availabilitySlot.findMany({ where: { tutorId: tutor.id } });
    expect(slots).toEqual([expect.objectContaining({ weekday: 5, startMinute: 570 })]);
    expect(await db.booking.findUnique({ where: { id: b.id } })).not.toBeNull();
  });

  it("only exposes weeks inside the booking window", async () => {
    const { tutor } = await setup();
    await expectDomainError(getWeekSlots(db, tutor.id, 9, NOW), "VALIDATION");
  });
});
