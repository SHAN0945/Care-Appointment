import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// Patient-facing doctor search. Only exposes what a patient needs to pick a
// doctor — no email, no leave calendar (that's admin-only via /api/admin/doctors).
export async function GET(req: Request) {
  const { response } = await requireRole("PATIENT");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const specialization = searchParams.get("specialization")?.trim();

  const doctors = await prisma.doctorProfile.findMany({
    where: specialization
      ? { specialization: { contains: specialization, mode: "insensitive" } }
      : undefined,
    select: {
      id: true,
      specialization: true,
      bio: true,
      slotDurationMinutes: true,
      workingHours: true,
      user: { select: { name: true } },
    },
    orderBy: { specialization: "asc" },
  });

  return NextResponse.json({ doctors });
}
