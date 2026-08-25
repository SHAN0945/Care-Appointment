import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { workingHoursSchema } from "../src/lib/working-hours";

// This script is meant to be run directly (`npx tsx prisma/seed-doctors.ts`),
// unlike seed.ts which goes through `prisma db seed` — so nothing auto-loads
// .env for it. Node's own built-in loader covers that (zero dependencies).
try {
  process.loadEnvFile();
} catch {}

const prisma = new PrismaClient();

// Demo/test doctor accounts — mirrors exactly what POST /api/admin/doctors
// does (same password hashing, same workingHours shape) so this data is
// indistinguishable from doctors created through the real admin UI.
// Run with: npx tsx prisma/seed-doctors.ts
// Safe to re-run — skips any doctor whose email already exists.
const DOCTORS = [
  {
    name: "Dr. Priya Sharma",
    email: "priya.sharma@clinic.test",
    password: "DoctorDemo123!",
    specialization: "General Physician",
    bio: "10+ years in general and family medicine.",
    slotDurationMinutes: 30,
    workingHours: {
      mon: { start: "09:00", end: "17:00" },
      tue: { start: "09:00", end: "17:00" },
      wed: { start: "09:00", end: "17:00" },
      thu: { start: "09:00", end: "17:00" },
      fri: { start: "09:00", end: "15:00" },
    },
  },
  {
    name: "Dr. Arjun Mehta",
    email: "arjun.mehta@clinic.test",
    password: "DoctorDemo123!",
    specialization: "Cardiology",
    bio: "Specializes in preventive cardiology and hypertension management.",
    slotDurationMinutes: 20,
    workingHours: {
      mon: { start: "10:00", end: "18:00" },
      wed: { start: "10:00", end: "18:00" },
      fri: { start: "10:00", end: "18:00" },
    },
  },
  {
    name: "Dr. Neha Kapoor",
    email: "neha.kapoor@clinic.test",
    password: "DoctorDemo123!",
    specialization: "Pediatrics",
    bio: "Child health, vaccinations, and growth monitoring.",
    slotDurationMinutes: 30,
    workingHours: {
      tue: { start: "09:00", end: "16:00" },
      thu: { start: "09:00", end: "16:00" },
      sat: { start: "09:00", end: "13:00" },
    },
  },
];

async function main() {
  for (const d of DOCTORS) {
    const workingHours = workingHoursSchema.parse(d.workingHours);

    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      console.log(`Skipping ${d.email} — already exists`);
      continue;
    }

    const passwordHash = await bcrypt.hash(d.password, 10);
    const doctor = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        passwordHash,
        role: "DOCTOR",
        doctorProfile: {
          create: {
            specialization: d.specialization,
            bio: d.bio,
            slotDurationMinutes: d.slotDurationMinutes,
            workingHours,
          },
        },
      },
    });
    console.log(`Created doctor: ${doctor.email} (password: ${d.password})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
