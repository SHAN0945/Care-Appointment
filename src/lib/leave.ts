import { startOfDay, endOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { queueNotification } from "@/lib/notifications";

/**
 * Cancels every PENDING/CONFIRMED appointment a doctor has on a given leave
 * date and queues a LEAVE_CONFLICT notification (email to the patient, plus
 * a CALENDAR entry so Phase 7's calendar sync knows to delete the event) for
 * each one. Called synchronously from the leave-creation API route so the
 * conflict is handled the moment leave is marked, not on a delay.
 */
export async function cancelAppointmentsForLeave(doctorId: string, date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const affected = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  for (const appt of affected) {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED" },
    });

    // Patient gets the human-readable explanation by email...
    await queueNotification({
      appointmentId: appt.id,
      recipientId: appt.patient.userId,
      type: "EMAIL",
      event: "LEAVE_CONFLICT",
      payload: { slotStart: appt.slotStart.toISOString() },
    });

    // ...and both sides' calendar events (created on booking, per spec) need
    // to be torn down since the slot no longer exists.
    await queueNotification({
      appointmentId: appt.id,
      recipientId: appt.patient.userId,
      type: "CALENDAR",
      event: "LEAVE_CONFLICT",
      payload: { action: "delete", slotStart: appt.slotStart.toISOString() },
    });
    await queueNotification({
      appointmentId: appt.id,
      recipientId: appt.doctor.userId,
      type: "CALENDAR",
      event: "LEAVE_CONFLICT",
      payload: { action: "delete", slotStart: appt.slotStart.toISOString() },
    });
  }

  return affected.length;
}
