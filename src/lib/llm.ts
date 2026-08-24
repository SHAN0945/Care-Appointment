import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { runLocalTriage } from "@/lib/symptom-triage";
import { buildLocalPostVisitSummary } from "@/lib/prescription-parser";

// Default model per Anthropic guidance; override with ANTHROPIC_MODEL if you
// want a cheaper model for a budget-constrained deploy (e.g. Haiku).
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

// `source` tells the caller (and, from there, the UI) which engine actually
// produced this result: a real LLM call, or the local rule-based fallback
// engine used when no API key is configured (see symptom-triage.ts /
// prescription-parser.ts). Never silently label a local result as "AI" —
// the doctor/patient-facing UI shows this distinction plainly.
export type LlmSource = "LLM" | "LOCAL";
export type LlmResult<T> = { ok: true; data: T; source: LlmSource } | { ok: false; error: string };

// ── Pre-visit summary ────────────────────────────────────────────────────
// Prompt text is exactly the spec's "LLM Usage Guidance" wording so the
// submission's documented prompt matches what actually runs.

const PreVisitSummarySchema = z.object({
  urgency: z.enum(["Low", "Medium", "High"]),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).length(3),
});
export type PreVisitSummary = z.infer<typeof PreVisitSummarySchema>;

export async function generatePreVisitSummary(symptoms: string): Promise<LlmResult<PreVisitSummary>> {
  const client = getClient();
  if (!client) {
    // No API key configured — fall back to the local rule-based triage
    // engine rather than failing outright. This is a deliberate upgrade
    // over "no key = error": the booking flow always gets a usable urgency
    // triage, just clearly labeled as not LLM-generated.
    return { ok: true, data: runLocalTriage(symptoms), source: "LOCAL" };
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}`,
        },
      ],
      output_config: { format: zodOutputFormat(PreVisitSummarySchema) },
    });

    if (!response.parsed_output) {
      return { ok: false, error: "Model returned output that didn't match the expected schema" };
    }
    return { ok: true, data: response.parsed_output, source: "LLM" };
  } catch (err) {
    console.error("generatePreVisitSummary failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Post-visit summary ───────────────────────────────────────────────────
// Structured medicationSchedule (with a normalized intervalHours) doubles as
// the direct data source for MedicationReminder rows in Phase 8 — no second
// parsing pass over the prescription text.

const MedicationScheduleItemSchema = z.object({
  medicationName: z.string(),
  dosage: z.string().optional(),
  frequency: z.string(), // human-readable, e.g. "twice daily"
  intervalHours: z.number().int().min(1).max(168), // normalized reminder cadence
  durationDays: z.number().int().min(1).max(90).optional(), // omit if ongoing/unspecified
});
export type MedicationScheduleItem = z.infer<typeof MedicationScheduleItemSchema>;

const PostVisitSummarySchema = z.object({
  patientSummary: z.string(),
  medicationSchedule: z.array(MedicationScheduleItemSchema),
  followUpSteps: z.array(z.string()),
});
export type PostVisitSummary = z.infer<typeof PostVisitSummarySchema>;

export async function generatePostVisitSummary(
  doctorNotes: string,
  prescription: string
): Promise<LlmResult<PostVisitSummary>> {
  const client = getClient();
  if (!client) {
    // No API key — fall back to the local prescription parser (regex over
    // dosage/frequency/duration patterns) rather than failing outright.
    return { ok: true, data: buildLocalPostVisitSummary(doctorNotes, prescription), source: "LOCAL" };
  }

  const notes = `Doctor notes: ${doctorNotes}\nPrescription: ${prescription}`;
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1536,
      messages: [
        {
          role: "user",
          content: `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}\n\nFor each medication, also give a normalized reminder interval in hours (e.g. "twice daily" -> 12, "every 8 hours" -> 8, "once daily" -> 24) and, if a course length is mentioned, its duration in days.`,
        },
      ],
      output_config: { format: zodOutputFormat(PostVisitSummarySchema) },
    });

    if (!response.parsed_output) {
      return { ok: false, error: "Model returned output that didn't match the expected schema" };
    }
    return { ok: true, data: response.parsed_output, source: "LLM" };
  } catch (err) {
    console.error("generatePostVisitSummary failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
