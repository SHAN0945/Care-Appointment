import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { workingHoursSchema } from "@/lib/working-hours";

const updateDoctorSchema = z.object({
  specialization: z.string().trim().min(1).max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).optional(),
  workingHours: workingHoursSchema.optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.doctorProfile.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const doctor = await prisma.doctorProfile.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ doctor });
}
