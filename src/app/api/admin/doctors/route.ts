import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/require-role";
import { workingHoursSchema } from "@/lib/working-hours";

export async function GET() {
  const { response } = await requireRole("ADMIN");
  if (response) return response;

  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      leaves: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ doctors });
}

const createDoctorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  specialization: z.string().trim().min(1).max(200),
  bio: z.string().trim().max(2000).optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).default(30),
  workingHours: workingHoursSchema,
});

export async function POST(req: Request) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, email, password, specialization, bio, slotDurationMinutes, workingHours } =
    parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const doctor = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "DOCTOR",
        doctorProfile: {
          create: { specialization, bio, slotDurationMinutes, workingHours },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        doctorProfile: true,
      },
    });

    return NextResponse.json({ doctor }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Doctor creation failed:", err);
    return NextResponse.json({ error: "Doctor creation failed" }, { status: 500 });
  }
}
