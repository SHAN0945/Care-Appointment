// Local, zero-dependency post-visit summary engine — the fallback used when
// no LLM API key is configured. Parses free-text prescription lines with
// regex (dosage, frequency, duration) rather than an LLM call; shape matches
// `PostVisitSummarySchema` in llm.ts exactly.

export type LocalMedicationScheduleItem = {
  medicationName: string;
  dosage?: string;
  frequency: string;
  intervalHours: number;
  durationDays?: number;
};

export type PostVisitResult = {
  patientSummary: string;
  medicationSchedule: LocalMedicationScheduleItem[];
  followUpSteps: string[];
};

// Ordered longest-phrase-first so "three times daily" matches before a
// looser "daily" fallback would.
const FREQUENCY_PATTERNS: { pattern: RegExp; hours: number; label: string }[] = [
  { pattern: /\bfour times (a day|daily)\b|\bqid\b/i, hours: 6, label: "four times daily" },
  { pattern: /\bthree times (a day|daily)\b|\bthrice daily\b|\btid\b/i, hours: 8, label: "three times daily" },
  { pattern: /\btwice (a day|daily)\b|\btwo times (a day|daily)\b|\bbid\b/i, hours: 12, label: "twice daily" },
  { pattern: /\bonce (a day|daily)\b|\bone time (a day|daily)\b|\bod\b/i, hours: 24, label: "once daily" },
  { pattern: /\bevery\s+(\d{1,2})\s*(hours|hrs|hr)\b/i, hours: 0, label: "" }, // hours captured dynamically below
  { pattern: /\bevery other day\b/i, hours: 48, label: "every other day" },
  { pattern: /\bonce (a )?week(ly)?\b/i, hours: 168, label: "once weekly" },
  { pattern: /\bat bedtime\b|\bnightly\b/i, hours: 24, label: "once daily at bedtime" },
];

function parseFrequency(text: string): { intervalHours: number; label: string } {
  const everyXHours = text.match(/\bevery\s+(\d{1,2})\s*(hours|hrs|hr)\b/i);
  if (everyXHours) {
    const h = parseInt(everyXHours[1], 10);
    return { intervalHours: h, label: `every ${h} hours` };
  }
  for (const { pattern, hours, label } of FREQUENCY_PATTERNS) {
    if (hours > 0 && pattern.test(text)) return { intervalHours: hours, label };
  }
  return { intervalHours: 24, label: "as directed" };
}

function parseDuration(text: string): number | undefined {
  const match = text.match(/\bfor\s+(\d{1,3})\s*(day|days|week|weeks)\b/i);
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  return /week/i.test(match[2]) ? n * 7 : n;
}

function parseDosage(text: string): string | undefined {
  const match = text.match(/\b(\d+(?:\.\d+)?\s?(?:mg|mcg|ml|g|iu))\b/i) ?? text.match(/\b(\d+)\s*(tablet|tablets|capsule|capsules|drop|drops|puff|puffs)\b/i);
  return match ? match[0].trim() : undefined;
}

const DOSAGE_FORM_PREFIXES = /^(tab\.?|tablet|cap\.?|capsule|syrup|inj\.?|injection|drops?)\s+/i;

function parseMedicationName(segment: string): string {
  // A " - " or ":" between the medication name and its instructions is
  // common enough ("Paracetamol - twice daily") that splitting on it first
  // avoids leaning on the punctuation-stripping regexes below to clean up
  // whatever's left dangling after the frequency/dosage text is removed.
  const beforeSeparator = segment.split(/\s+[-–]\s+|:\s+/)[0];

  let name = beforeSeparator
    .replace(/\b\d+(?:\.\d+)?\s?(?:mg|mcg|ml|g|iu)\b/gi, "")
    .replace(/\b(once|twice|three times|four times|thrice|every)\b.*$/i, "")
    .replace(/\bfor\s+\d+\s*(day|days|week|weeks)\b.*$/i, "")
    .replace(/[-–,;:\s]+$/, "")
    .trim();
  name = name.replace(DOSAGE_FORM_PREFIXES, "");
  return name.length > 0 ? capitalize(name) : "Prescribed medication";
}

/** Splits a free-text prescription into one segment per medication. */
function splitMedications(prescription: string): string[] {
  return prescription
    .split(/\r?\n|;|(?:^|\s)\d+[.)]\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parsePrescription(prescription: string): LocalMedicationScheduleItem[] {
  return splitMedications(prescription).map((segment) => {
    const { intervalHours, label } = parseFrequency(segment);
    return {
      medicationName: parseMedicationName(segment),
      dosage: parseDosage(segment),
      frequency: label,
      intervalHours,
      durationDays: parseDuration(segment),
    };
  });
}

const GENERIC_FOLLOW_UP = [
  "Take all medications exactly as prescribed, even if you start feeling better.",
  "Rest and stay well hydrated while you recover.",
  "Contact the clinic if your symptoms worsen or don't improve within a few days.",
];

export function buildLocalPostVisitSummary(doctorNotes: string, prescription: string): PostVisitResult {
  const medicationSchedule = parsePrescription(prescription);

  const medLine =
    medicationSchedule.length > 0
      ? `Your prescribed medication: ${medicationSchedule
          .map((m) => `${m.medicationName}${m.dosage ? ` (${m.dosage})` : ""} — ${m.frequency}`)
          .join("; ")}.`
      : "No medication was prescribed at this visit.";

  const patientSummary = `Your doctor's notes from this visit: ${doctorNotes.trim()} ${medLine}`.trim();

  return {
    patientSummary,
    medicationSchedule,
    followUpSteps: [...GENERIC_FOLLOW_UP, "Attend any follow-up appointment your doctor recommends."],
  };
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
