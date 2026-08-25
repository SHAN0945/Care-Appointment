import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// `prisma db seed` loads .env itself before invoking this script, but running
// it directly (`npx tsx prisma/seed.ts`) does not — Node's own built-in
// loader (no dependency needed) covers that case too. Wrapped in try/catch
// since it throws if .env doesn't exist, which is fine (env vars may already
// be set another way, e.g. in CI or Vercel).
try {
  process.loadEnvFile();
} catch {}

const prisma = new PrismaClient();

// Bootstraps the single admin account from env vars. Run with:
//   npx prisma db seed
// Set ADMIN_EMAIL / ADMIN_PASSWORD in .env before running (falls back to a
// dev default if unset — change it immediately if you rely on the default).
async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@clinic.test").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Clinic Admin",
      role: "ADMIN",
    },
  });

  console.log(`Created admin account: ${admin.email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Using default dev password "${password}" — set ADMIN_PASSWORD in .env to change it.`);
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
