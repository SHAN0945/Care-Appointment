import { prisma } from "@/lib/prisma";
import { queueNotification } from "@/lib/notifications";

// How far ahead of an appointment its reminder email goes out. This is a
// window, not an exact instant, so reminders still fire correctly regardless
// of how often the cron actually runs (see vercel.json's note on Vercel's
// per-plan cron frequency limits) — idempotency comes from checking for an
// existing notification log row, not from a tight time match.
const REMINDER_LEAD_HOURS = 24;

/**
 * Queues an APPOINTMENT_REMINDER email for both sides of every CONFIRMED
 * appointment landing inside the reminder window, skipping anyone who
 * already has one logged for that appointment.
 */
export async function enqueueAppointmentReminders(): Promise<{ queued: number }> {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_LEAD_HOURS * 60 * 60_000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      slotStart: { gte: now, lte: horizon },
    },
    include: {
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
      notifications: {
        where: { event: "APPOINTMENT_REMINDER" },
        select: { recipientId: true },
      },
    },
  });

  let queued = 0;
  for (const appt of upcoming) {
    const alreadyNotified = new Set(appt.notifications.map((n) => n.recipientId));
    for (const recipientId of [appt.patient.userId, appt.doctor.userId]) {
      if (alreadyNotified.has(recipientId)) continue;
      await queueNotification({
        appointmentId: appt.id,
        recipientId,
        type: "EMAIL",
        event: "APPOINTMENT_REMINDER",
        payload: { slotStart: appt.slotStart.toISOString() },
      });
      queued++;
    }
  }
  return { queued };
}
