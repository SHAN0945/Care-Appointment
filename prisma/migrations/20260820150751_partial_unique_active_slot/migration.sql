-- DropIndex
DROP INDEX "Appointment_doctorId_slotStart_key";

-- CreateIndex
CREATE INDEX "Appointment_doctorId_slotStart_idx" ON "Appointment"("doctorId", "slotStart");

-- Partial unique index: only one PENDING/CONFIRMED appointment may occupy a
-- given (doctorId, slotStart) at a time. CANCELLED/COMPLETED rows are exempt,
-- so a cancelled slot becomes bookable again. Not expressible via Prisma's
-- schema DSL (`@@unique` has no WHERE clause), so this is hand-written.
CREATE UNIQUE INDEX "Appointment_doctorId_slotStart_active_key"
  ON "Appointment"("doctorId", "slotStart")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
