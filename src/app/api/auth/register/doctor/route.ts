import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { workingHoursSchema } from "@/lib/working-hours";

// Public self-registration for doctors — same shape/validation as the
// admin-only /api/admin/doctors creation route, minus the ADMIN auth check.
// Activates immediately (no approval queue), matching the trust model the
// patient self-registration route already uses — consistent behavior across
// both public sign-up paths rather than adding an approval workflow only
// doctors go through.
const registerDoctorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  specialization: z.string().trim().min(1).max(200),
  bio: z.string().trim().max(2000).optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).default(30),
  workingHours: workingHoursSchema,
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerDoctorSchema.safeParse(body);
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
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "DOCTOR",
        doctorProfile: {
          create: { specialization, bio, slotDurationMinutes, workingHours },
        },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Doctor registration failed:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
