import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// This script is meant to be run directly (`npx tsx prisma/seed-patient.ts`),
// unlike seed.ts which goes through `prisma db seed` — so nothing auto-loads
// .env for it. Node's own built-in loader covers that (zero dependencies).
try {
  process.loadEnvFile();
} catch {}

const prisma = new PrismaClient();

// Demo patient account — mirrors exactly what POST /api/auth/register does
// (same password hashing), so this data is indistinguishable from a patient
// who registered through the real UI. Matches the credentials already
// documented in the README's demo credentials table.
// Run with: npx tsx prisma/seed-patient.ts
// Safe to re-run — skips if the email already exists.
const PATIENT = {
  name: "Demo Patient",
  email: "qwerty@gm.com",
  password: "QWERTY11",
};

async function main() {
  const email = PATIENT.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Skipping ${email} — already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(PATIENT.password, 10);
  const patient = await prisma.user.create({
    data: {
      name: PATIENT.name,
      email,
      passwordHash,
      role: "PATIENT",
      patientProfile: { create: {} },
    },
  });
  console.log(`Created patient: ${patient.email} (password: ${PATIENT.password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
