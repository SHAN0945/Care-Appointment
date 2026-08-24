import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getDoctorProfileId } from "@/lib/current-user";
import { buildAppointmentICS } from "@/lib/ics";

// Same universal .ics export as the patient route, for the doctor's side.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireRole("DOCTOR");
  if (response) return response;
  const { id: appointmentId } = await params;

  const doctorId = await getDoctorProfileId(session.user.id);
  if (!doctorId) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { select: { user: { select: { name: true } } } } },
  });
  if (!appointment || appointment.doctorId !== doctorId) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!["CONFIRMED", "COMPLETED"].includes(appointment.status)) {
    return NextResponse.json({ error: "Only confirmed appointments can be exported" }, { status: 409 });
  }

  const ics = buildAppointmentICS({
    uid: appointment.id,
    slotStart: appointment.slotStart,
    slotEnd: appointment.slotEnd,
    summary: `Appointment with ${appointment.patient.user.name}`,
    description: "Booked via CareFlow",
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${appointment.id}.ics"`,
    },
  });
}
