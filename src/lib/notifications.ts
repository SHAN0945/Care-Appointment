import { NotificationEvent, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Queues a notification instead of sending it inline. This is the single
 * write path every trigger (booking, cancellation, leave conflict, med
 * reminder) goes through, so every send attempt is logged up front and the
 * Phase 8 cron can pick up anything that's still PENDING/FAILED and retry it
 * with capped attempts — see the system design write-up for the full
 * rationale on why sends are queued rather than fired synchronously.
 *
 * Phase 6 implements the actual EMAIL sender (Resend) and Phase 7 the
 * CALENDAR sender (Google Calendar API); until then rows just accumulate as
 * PENDING, which is safe and inspectable.
 */
export async function queueNotification(params: {
  appointmentId?: string;
  recipientId: string;
  type: NotificationType;
  event: NotificationEvent;
  payload?: Record<string, unknown>;
}) {
  return prisma.notificationLog.create({
    data: {
      appointmentId: params.appointmentId,
      recipientId: params.recipientId,
      type: params.type,
      event: params.event,
      payload: params.payload as Prisma.InputJsonValue | undefined,
      status: "PENDING",
    },
  });
}
