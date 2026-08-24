import { prisma } from "@/lib/prisma";

/**
 * Cancels PENDING appointments whose hold has expired, freeing the slot for
 * re-booking. No notification is queued — an expired hold was never
 * CONFIRMED, so neither side has anything to be told about (same rule the
 * patient-initiated cancel route uses for abandoned PENDING holds).
 */
export async function sweepExpiredHolds(): Promise<{ swept: number }> {
  const result = await prisma.appointment.updateMany({
    where: { status: "PENDING", holdExpiresAt: { lt: new Date() } },
    data: { status: "CANCELLED", holdExpiresAt: null },
  });
  return { swept: result.count };
}
