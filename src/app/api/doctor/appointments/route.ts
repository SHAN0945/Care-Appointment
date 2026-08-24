import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getDoctorProfileId } from "@/lib/current-user";

export async function GET() {
  const { session, response } = await requireRole("DOCTOR");
  if (response) return response;

  const doctorId = await getDoctorProfileId(session.user.id);
  if (!doctorId) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });

  const appointments = await prisma.appointment.findMany({
    where: { doctorId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    include: {
      patient: { select: { user: { select: { name: true } } } },
      symptomForm: true,
      visitNotes: true,
    },
    orderBy: { slotStart: "asc" },
  });

  return NextResponse.json({ appointments });
}
