import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getPatientProfileId } from "@/lib/current-user";
import { queueNotification } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireRole("PATIENT");
  if (response) return response;
  const { id: appointmentId } = await params;

  const patientId = await getPatientProfileId(session.user.id);
  if (!patientId) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { select: { userId: true } }, patient: { select: { userId: true } } },
  });
  if (!appointment || appointment.patientId !== patientId) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
    return NextResponse.json({ error: "This appointment can't be cancelled" }, { status: 409 });
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED", holdExpiresAt: null },
  });

  // Only send cancellation notices for appointments that were actually
  // confirmed (and therefore visible/expected by the doctor) — an abandoned
  // PENDING hold cancelling itself doesn't need to notify anyone.
  if (appointment.status === "CONFIRMED") {
    for (const recipientId of [appointment.patient.userId, appointment.doctor.userId]) {
      await queueNotification({
        appointmentId,
        recipientId,
        type: "EMAIL",
        event: "CANCELLATION",
        payload: { slotStart: appointment.slotStart.toISOString() },
      });
      await queueNotification({
        appointmentId,
        recipientId,
        type: "CALENDAR",
        event: "CANCELLATION",
        payload: { action: "delete", slotStart: appointment.slotStart.toISOString() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
