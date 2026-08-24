import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getPatientProfileId } from "@/lib/current-user";
import { buildAppointmentICS } from "@/lib/ics";

// Universal calendar export for a patient's own appointment — works for
// Apple Calendar/Outlook/Google-via-import, independent of whether Google
// Calendar OAuth was ever connected (see src/lib/ics.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireRole("PATIENT");
  if (response) return response;
  const { id: appointmentId } = await params;

  const patientId = await getPatientProfileId(session.user.id);
  if (!patientId) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { select: { specialization: true, user: { select: { name: true } } } } },
  });
  if (!appointment || appointment.patientId !== patientId) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!["CONFIRMED", "COMPLETED"].includes(appointment.status)) {
    return NextResponse.json({ error: "Only confirmed appointments can be exported" }, { status: 409 });
  }

  const ics = buildAppointmentICS({
    uid: appointment.id,
    slotStart: appointment.slotStart,
    slotEnd: appointment.slotEnd,
    summary: `Appointment with ${appointment.doctor.user.name}`,
    description: `${appointment.doctor.specialization} — booked via CareFlow`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${appointment.id}.ics"`,
    },
  });
}
