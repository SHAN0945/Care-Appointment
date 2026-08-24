import { NotificationLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import {
  bookingConfirmationEmail,
  cancellationEmail,
  leaveConflictEmail,
  appointmentReminderEmail,
  medicationReminderEmail,
} from "@/lib/email-templates";
import { MAX_NOTIFICATION_ATTEMPTS } from "@/lib/constants";

type Payload = Record<string, unknown> | null;

async function loadAppointmentContext(appointmentId: string | null) {
  if (!appointmentId) return null;
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { userId: true, user: { select: { name: true } } } },
      patient: { select: { userId: true, user: { select: { name: true } } } },
    },
  });
}

async function attemptEmail(n: NotificationLog): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload = n.payload as Payload;
  const appt = await loadAppointmentContext(n.appointmentId);

  const recipient = await prisma.user.findUnique({ where: { id: n.recipientId } });
  if (!recipient) return { ok: false, error: "Recipient user no longer exists" };

  let subject: string;
  let html: string;

  if (n.event === "MEDICATION_REMINDER") {
    const t = medicationReminderEmail({
      recipientName: recipient.name,
      medicationName: String(payload?.medicationName ?? "your medication"),
      dosage: payload?.dosage as string | undefined,
      frequency: String(payload?.frequency ?? ""),
    });
    subject = t.subject;
    html = t.html;
  } else {
    if (!appt) return { ok: false, error: "Appointment no longer exists" };
    const isPatient = recipient.id === appt.patient.userId;
    const otherPartyName = isPatient ? appt.doctor.user.name : appt.patient.user.name;
    const slotStart = appt.slotStart.toISOString();

    if (n.event === "BOOKING_CONFIRMATION") {
      ({ subject, html } = bookingConfirmationEmail({ recipientName: recipient.name, otherPartyName, slotStart, isPatient }));
    } else if (n.event === "CANCELLATION") {
      ({ subject, html } = cancellationEmail({ recipientName: recipient.name, otherPartyName, slotStart, isPatient }));
    } else if (n.event === "LEAVE_CONFLICT") {
      ({ subject, html } = leaveConflictEmail({ recipientName: recipient.name, doctorName: appt.doctor.user.name, slotStart }));
    } else if (n.event === "APPOINTMENT_REMINDER") {
      ({ subject, html } = appointmentReminderEmail({ recipientName: recipient.name, otherPartyName, slotStart, isPatient }));
    } else {
      return { ok: false, error: `Unhandled notification event: ${n.event}` };
    }
  }

  return sendEmail(recipient.email, subject, html);
}

async function attemptCalendar(n: NotificationLog): Promise<{ ok: true; eventId?: string } | { ok: false; error: string }> {
  const payload = n.payload as Payload;
  const action = (payload?.action as string) ?? "create";
  const appt = await loadAppointmentContext(n.appointmentId);
  if (!appt) return { ok: false, error: "Appointment no longer exists" };

  if (action === "delete") {
    const original = await prisma.notificationLog.findFirst({
      where: {
        appointmentId: n.appointmentId,
        recipientId: n.recipientId,
        type: "CALENDAR",
        status: "SENT",
        externalEventId: { not: null },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!original?.externalEventId) {
      // Nothing was ever created (e.g. recipient never connected Calendar) —
      // there's nothing to delete, so this is a successful no-op, not a failure.
      return { ok: true };
    }
    return deleteCalendarEvent(n.recipientId, original.externalEventId);
  }

  const isPatient = n.recipientId === appt.patient.userId;
  const otherPartyName = isPatient ? appt.doctor.user.name : appt.patient.user.name;
  return createCalendarEvent(n.recipientId, {
    summary: isPatient ? `Appointment with Dr. ${otherPartyName}` : `Appointment with ${otherPartyName}`,
    start: appt.slotStart,
    end: appt.slotEnd,
  });
}

/** Attempts to send one queued notification and updates its row accordingly. */
export async function processOne(n: NotificationLog): Promise<void> {
  const result = n.type === "EMAIL" ? await attemptEmail(n) : await attemptCalendar(n);

  if (result.ok) {
    await prisma.notificationLog.update({
      where: { id: n.id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        lastError: null,
        ...("eventId" in result && result.eventId ? { externalEventId: result.eventId } : {}),
      },
    });
    return;
  }

  const attempts = n.attempts + 1;
  await prisma.notificationLog.update({
    where: { id: n.id },
    data: {
      status: attempts >= MAX_NOTIFICATION_ATTEMPTS ? "ABANDONED" : "FAILED",
      attempts,
      lastError: result.error,
    },
  });
}

/** Processes every PENDING or retryable-FAILED notification, oldest first. Called by the cron route. */
export async function processNotificationQueue(limit = 50): Promise<{ processed: number }> {
  const due = await prisma.notificationLog.findMany({
    where: {
      OR: [{ status: "PENDING" }, { status: "FAILED", attempts: { lt: MAX_NOTIFICATION_ATTEMPTS } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const n of due) {
    await processOne(n);
  }
  return { processed: due.length };
}
