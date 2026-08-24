import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "@/lib/date-utils";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { cancelAppointmentsForLeave } from "@/lib/leave";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  const { id } = await params;

  const leaves = await prisma.leave.findMany({
    where: { doctorId: id },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ leaves });
}

const createLeaveSchema = z.object({
  date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), "Invalid date"),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  const { id: doctorId } = await params;

  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createLeaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const date = startOfDay(new Date(parsed.data.date));

  try {
    const leave = await prisma.leave.create({
      data: { doctorId, date, reason: parsed.data.reason },
    });

    // This is the trigger the build plan calls out explicitly: marking leave
    // for a date with existing bookings must notify affected patients, not
    // wait for an admin to notice. Runs synchronously so it's guaranteed to
    // happen the moment leave is confirmed, before this request returns.
    const cancelledCount = await cancelAppointmentsForLeave(doctorId, date);

    return NextResponse.json({ leave, cancelledCount }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Leave already recorded for this date" },
        { status: 409 }
      );
    }
    console.error("Leave creation failed:", err);
    return NextResponse.json({ error: "Leave creation failed" }, { status: 500 });
  }
}
