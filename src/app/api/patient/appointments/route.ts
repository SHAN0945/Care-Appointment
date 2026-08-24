import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getPatientProfileId } from "@/lib/current-user";
import { isUniqueViolation } from "@/lib/db-errors";
import { HOLD_DURATION_MINUTES } from "@/lib/constants";

export async function GET() {
  const { session, response } = await requireRole("PATIENT");
  if (response) return response;

  const patientId = await getPatientProfileId(session.user.id);
  if (!patientId) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  const appointments = await prisma.appointment.findMany({
    where: { patientId },
    include: {
      doctor: { select: { specialization: true, user: { select: { name: true } } } },
      symptomForm: true,
      visitNotes: true,
    },
    orderBy: { slotStart: "desc" },
  });

  return NextResponse.json({ appointments });
}

const createHoldSchema = z.object({
  doctorId: z.string().min(1),
  slotStart: z.string().refine((d) => !Number.isNaN(Date.parse(d)), "Invalid date"),
});

export async function POST(req: Request) {
  const { session, response } = await requireRole("PATIENT");
  if (response) return response;

  const patientId = await getPatientProfileId(session.user.id);
  if (!patientId) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createHoldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const doctor = await prisma.doctorProfile.findUnique({ where: { id: parsed.data.doctorId } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const slotStart = new Date(parsed.data.slotStart);
  if (slotStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Slot is in the past" }, { status: 400 });
  }
  const slotEnd = new Date(slotStart.getTime() + doctor.slotDurationMinutes * 60_000);
  const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60_000);

  try {
    // The unique-violation catch below — not a pre-check query — is what
    // actually prevents double-booking under concurrent requests. A
    // "check then insert" pattern has a race window; letting the database's
    // partial unique index reject the second concurrent insert does not.
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId,
        slotStart,
        slotEnd,
        status: "PENDING",
        holdExpiresAt,
      },
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "That slot is no longer available" }, { status: 409 });
    }
    console.error("Appointment hold failed:", err);
    return NextResponse.json({ error: "Failed to hold slot" }, { status: 500 });
  }
}
