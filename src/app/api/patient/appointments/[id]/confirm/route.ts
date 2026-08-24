import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getPatientProfileId } from "@/lib/current-user";
import { generatePreVisitSummary } from "@/lib/llm";
import { queueNotification } from "@/lib/notifications";

const confirmSchema = z.object({
  symptoms: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireRole("PATIENT");
  if (response) return response;
  const { id: appointmentId } = await params;

  const patientId = await getPatientProfileId(session.user.id);
  if (!patientId) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { userId: true, user: { select: { name: true } } } },
      patient: { select: { userId: true, user: { select: { name: true } } } },
    },
  });
  if (!appointment || appointment.patientId !== patientId) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appointment.status !== "PENDING") {
    return NextResponse.json({ error: "This appointment is not awaiting confirmation" }, { status: 409 });
  }
  if (appointment.holdExpiresAt && appointment.holdExpiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Your hold on this slot expired — please book again" },
      { status: 409 }
    );
  }

  // LLM call is best-effort: a failure here must never block the booking.
  // Store the failure flag/reason and let the doctor see "AI summary
  // unavailable" instead of losing the appointment entirely.
  const llmResult = await generatePreVisitSummary(parsed.data.symptoms);

  const [, symptomForm] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CONFIRMED", holdExpiresAt: null },
    }),
    prisma.symptomForm.create({
      data: {
        appointmentId,
        symptoms: parsed.data.symptoms,
        ...(llmResult.ok
          ? {
              aiUrgency: llmResult.data.urgency.toUpperCase() as "LOW" | "MEDIUM" | "HIGH",
              aiChiefComplaint: llmResult.data.chiefComplaint,
              aiSuggestedQuestions: llmResult.data.suggestedQuestions,
              aiSource: llmResult.source,
            }
          : { aiSummaryFailed: true, aiSummaryError: llmResult.error }),
      },
    }),
  ]);

  // Booking confirmation: email to both sides, calendar event for both sides.
  // Actual sending happens in the notification queue processor (Phase 6/7);
  // this just guarantees the attempt is durably recorded.
  for (const recipientId of [appointment.patient.userId, appointment.doctor.userId]) {
    await queueNotification({
      appointmentId,
      recipientId,
      type: "EMAIL",
      event: "BOOKING_CONFIRMATION",
      payload: { slotStart: appointment.slotStart.toISOString() },
    });
    await queueNotification({
      appointmentId,
      recipientId,
      type: "CALENDAR",
      event: "BOOKING_CONFIRMATION",
      payload: { action: "create", slotStart: appointment.slotStart.toISOString() },
    });
  }

  return NextResponse.json({ symptomForm });
}
