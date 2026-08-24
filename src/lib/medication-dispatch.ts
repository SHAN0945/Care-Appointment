import { prisma } from "@/lib/prisma";
import { queueNotification } from "@/lib/notifications";

/**
 * Fires every MedicationReminder row that's due, then advances it to its
 * next occurrence — or marks it done once remindersLeft is exhausted, so the
 * `[nextSendAt, sent]` index keeps this query cheap over time.
 */
export async function dispatchMedicationReminders(): Promise<{ dispatched: number }> {
  const due = await prisma.medicationReminder.findMany({
    where: { sent: false, nextSendAt: { lte: new Date() } },
    include: {
      appointment: { select: { patient: { select: { userId: true } } } },
    },
  });

  let dispatched = 0;
  for (const med of due) {
    await queueNotification({
      appointmentId: med.appointmentId,
      recipientId: med.appointment.patient.userId,
      type: "EMAIL",
      event: "MEDICATION_REMINDER",
      payload: { medicationName: med.medicationName, dosage: med.dosage, frequency: med.frequency },
    });

    const remindersLeft = med.remindersLeft - 1;
    await prisma.medicationReminder.update({
      where: { id: med.id },
      data: {
        remindersLeft,
        sent: remindersLeft <= 0,
        nextSendAt: new Date(med.nextSendAt.getTime() + med.intervalHours * 60 * 60_000),
      },
    });
    dispatched++;
  }
  return { dispatched };
}
