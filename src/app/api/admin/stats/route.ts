import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function GET() {
  const { response } = await requireRole("ADMIN");
  if (response) return response;

  const [patients, doctors, appointments, upcoming] = await Promise.all([
    prisma.patientProfile.count(),
    prisma.doctorProfile.count(),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, slotStart: { gte: new Date() } },
    }),
  ]);

  return NextResponse.json({ patients, doctors, appointments, upcoming });
}
