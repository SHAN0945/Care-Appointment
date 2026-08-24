import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getDoctorProfileId } from "@/lib/current-user";
import { generatePostVisitSummary } from "@/lib/llm";

const notesSchema = z.object({
  doctorNotes: z.string().trim().min(1).max(8000),
  prescription: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireRole("DOCTOR");
  if (response) return response;
  const { id: appointmentId } = await params;

  const doctorId = await getDoctorProfileId(session.user.id);
  if (!doctorId) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = notesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.doctorId !== doctorId) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appointment.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Post-visit notes can only be added to a confirmed appointment" },
      { status: 409 }
    );
  }

  // LLM call is best-effort — same fallback contract as the pre-visit
  // summary: a failure never blocks saving the doctor's actual notes.
  const llmResult = await generatePostVisitSummary(parsed.data.doctorNotes, parsed.data.prescription);

  const visitNotes = await prisma.visitNotes.create({
    data: {
      appointmentId,
      doctorNotes: parsed.data.doctorNotes,
      prescription: parsed.data.prescription,
      ...(llmResult.ok
        ? { aiPatientSummary: llmResult.data.patientSummary, aiSource: llmResult.source }
        : { aiSummaryFailed: true, aiSummaryError: llmResult.error }),
    },
  });

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } });

  // Medication reminders are only derivable when the LLM produced a
  // structured schedule; if it failed, no reminders are scheduled (an
  // accepted, documented fallback — the raw prescription text is still
  // saved and visible either way).
  if (llmResult.ok && llmResult.data.medicationSchedule.length > 0) {
    const now = new Date();
    await prisma.medicationReminder.createMany({
      data: llmResult.data.medicationSchedule.map((med) => {
        const remindersLeft = med.durationDays
          ? Math.max(1, Math.floor((med.durationDays * 24) / med.intervalHours))
          : 3; // no course length given — send a bounded default run of reminders
        return {
          appointmentId,
          visitNotesId: visitNotes.id,
          medicationName: med.medicationName,
          dosage: med.dosage,
          frequency: med.frequency,
          intervalHours: med.intervalHours,
          remindersLeft,
          nextSendAt: new Date(now.getTime() + med.intervalHours * 60 * 60_000),
        };
      }),
    });
  }

  return NextResponse.json({ visitNotes });
}
