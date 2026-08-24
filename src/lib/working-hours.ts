import { z } from "zod";

// Working hours are keyed by lowercase 3-letter day; a missing key means the
// doctor doesn't work that day. Times are 24h "HH:mm" in the clinic's local
// time (single-timezone assumption — documented as a scope limit).
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayRangeSchema = z
  .object({
    start: z.string().regex(timeRegex, "Expected HH:mm"),
    end: z.string().regex(timeRegex, "Expected HH:mm"),
  })
  .refine((r) => r.start < r.end, { message: "start must be before end" });

// Not z.record(z.enum(DAY_KEYS), ...): in Zod v4, a record keyed by an
// enum/literal union requires ALL keys to be present, which is the opposite
// of what we want (missing key = doctor doesn't work that day). An object
// with every day marked optional gets the "partial map" semantics we need.
export const workingHoursSchema = z
  .object({
    mon: dayRangeSchema.optional(),
    tue: dayRangeSchema.optional(),
    wed: dayRangeSchema.optional(),
    thu: dayRangeSchema.optional(),
    fri: dayRangeSchema.optional(),
    sat: dayRangeSchema.optional(),
    sun: dayRangeSchema.optional(),
  })
  .refine((wh) => Object.values(wh).some(Boolean), {
    message: "At least one working day is required",
  });

export type WorkingHours = z.infer<typeof workingHoursSchema>;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

// Shared by the admin doctor-card and the patient booking flow so both
// render "Mon 09:00–17:00, Wed 09:00–17:00, …" identically.
export function formatWorkingHours(wh: Partial<WorkingHours>): string {
  return DAY_KEYS.filter((d) => wh[d])
    .map((d) => `${DAY_LABELS[d]} ${wh[d]!.start}–${wh[d]!.end}`)
    .join(", ");
}
