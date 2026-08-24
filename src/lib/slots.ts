import { DAY_KEYS, DayKey, WorkingHours } from "@/lib/working-hours";
import { prisma } from "@/lib/prisma";

// Single-timezone assumption: all clock times (working hours, slot times,
// "now") are treated as the clinic's local wall-clock time stored directly
// as UTC-labelled Dates, with no real timezone conversion. Documented as a
// scope limitation in the system design write-up — fine for a single-clinic
// deployment, would need a clinic timezone field for multi-location.

function dayKeyFor(date: Date): DayKey {
  // getUTCDay(): 0=Sun..6=Sat. DAY_KEYS is Mon-first.
  const jsDay = date.getUTCDay();
  return DAY_KEYS[(jsDay + 6) % 7];
}

function atTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

export type Slot = { start: Date; end: Date };

/** Every slot the doctor's working hours produce for that calendar date, ignoring bookings/leave/"now". */
export function generateSlotsForDate(
  date: Date,
  workingHours: WorkingHours,
  slotDurationMinutes: number
): Slot[] {
  const dayKey = dayKeyFor(date);
  const range = workingHours[dayKey];
  if (!range) return [];

  const dayStart = atTime(date, range.start);
  const dayEnd = atTime(date, range.end);

  const slots: Slot[] = [];
  let cursor = dayStart;
  while (cursor.getTime() + slotDurationMinutes * 60_000 <= dayEnd.getTime()) {
    const end = new Date(cursor.getTime() + slotDurationMinutes * 60_000);
    slots.push({ start: cursor, end });
    cursor = end;
  }
  return slots;
}

/**
 * Available slots for a doctor on a given date: generated from working
 * hours, then minus leave days, minus already-active (PENDING with a live
 * hold, or CONFIRMED) appointments, minus anything already in the past.
 */
export async function getAvailableSlots(doctorId: string, date: Date): Promise<Slot[]> {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) return [];

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const leave = await prisma.leave.findFirst({
    where: { doctorId, date: { gte: dayStart, lt: dayEnd } },
  });
  if (leave) return [];

  const workingHours = doctor.workingHours as WorkingHours;
  const allSlots = generateSlotsForDate(dayStart, workingHours, doctor.slotDurationMinutes);
  if (allSlots.length === 0) return [];

  const now = new Date();
  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: dayStart, lt: dayEnd },
      OR: [{ status: "CONFIRMED" }, { status: "PENDING", holdExpiresAt: { gt: now } }],
    },
    select: { slotStart: true },
  });
  const bookedSet = new Set(booked.map((b) => b.slotStart.getTime()));

  return allSlots.filter((s) => s.start.getTime() > now.getTime() && !bookedSet.has(s.start.getTime()));
}
