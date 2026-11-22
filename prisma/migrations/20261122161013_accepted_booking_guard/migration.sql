-- Defense in depth against double booking: a tutor can hold at most one ACCEPTED
-- booking per start time. Prisma cannot express partial indexes, so this lives in raw SQL.
CREATE UNIQUE INDEX "Booking_tutor_accepted_start_key" ON "Booking"("tutorId", "startAt") WHERE "status" = 'ACCEPTED';
