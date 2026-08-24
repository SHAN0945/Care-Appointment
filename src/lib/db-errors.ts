import { Prisma } from "@prisma/client";

/**
 * True if `err` is a unique-constraint violation. Handles both constraints
 * Prisma knows about from schema.prisma (surfaced as P2002) and the
 * hand-written partial unique index on Appointment(doctorId, slotStart)
 * WHERE status IN ('PENDING','CONFIRMED') — which Prisma doesn't statically
 * know about, so the raw Postgres SQLSTATE 23505 is the fallback check.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return true;
  if (err instanceof Error && /23505/.test(err.message)) return true;
  return false;
}
