import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { runLocalTriage } from "@/lib/symptom-triage";
import { buildLocalPostVisitSummary } from "@/lib/prescription-parser";
import { checkSymptoms } from "@/lib/symptom-checker";

// Default model per Anthropic guidance; override with ANTHROPIC_MODEL if you
// want a cheaper model for a budget-constrained deploy (e.g. Haiku).
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
// Gemini's REST API needs no SDK — it's a single JSON POST — so this
// integration is done with a plain fetch() call rather than pulling in
// @google/generative-ai as a dependency for what's otherwise ~20 lines.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

// `source` tells the caller (and, from there, the UI) which engine actually
// produced this result: a real LLM call, or the local rule-based fallback
// engine used when no API key is configured (see symptom-triage.ts /
// prescription-parser.ts / symptom-checker.ts). Never silently label a
// local result as "AI" — the doctor/patient-facing UI shows this
// distinction plainly.
export type LlmSource = "LLM" | "LOCAL";
export type LlmResult<T> = { ok: true; data: T; source: LlmSource } | { ok: false; error: string };

type Provider = "anthropic" | "gemini";

// Anthropic takes priority if both keys happen to be set. Either one alone
// is enough to light up real AI; with neither, every generate* function
// below falls back to its local rule-based/knowledge-base engine.
function getProvider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

async function callAnthropic<T>(prompt: string, schema: z.ZodType<T>, maxTokens: number): Promise<LlmResult<T>> {
  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(schema) },
    });
    if (!response.parsed_output) {
      return { ok: false, error: "Model returned output that didn't match the expected schema" };
    }
    return { ok: true, data: response.parsed_output, source: "LLM" };
  } catch (err) {
    console.error("Anthropic call failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Gemini's `responseSchema` is a restricted OpenAPI-style subset of JSON
// Schema. We hand-write one per shape below (only three of them) rather
// than adding a zod-to-json-schema dependency just for this.
async function callGemini<T>(prompt: string, responseSchema: object, zodSchema: z.ZodType<T>): Promise<LlmResult<T>> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema },
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Gemini API error ${res.status}: ${text.slice(0, 300)}` };
    }
    const body = await res.json();
    const text: string | undefined = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, error: "Gemini returned no content" };

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      return { ok: false, error: "Gemini returned output that wasn't valid JSON" };
    }
    const parsed = zodSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { ok: false, error: "Gemini output didn't match the expected schema" };
    }
    return { ok: true, data: parsed.data, source: "LLM" };
  } catch (err) {
    console.error("Gemini call failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function callLlm<T>(
  prompt: string,
  zodSchema: z.ZodType<T>,
  geminiSchema: object,
  maxTokens: number
): Promise<LlmResult<T>> {
  const provider = getProvider();
  if (provider === "gemini") return callGemini(prompt, geminiSchema, zodSchema);
  return callAnthropic(prompt, zodSchema, maxTokens);
}

const URGENCY_ENUM = { type: "string", enum: ["Low", "Medium", "High"] };

// ── Pre-visit summary ────────────────────────────────────────────────────
// Prompt text is exactly the spec's "LLM Usage Guidance" wording so the
// submission's documented prompt matches what actually runs.

const PreVisitSummarySchema = z.object({
  urgency: z.enum(["Low", "Medium", "High"]),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).length(3),
});
export type PreVisitSummary = z.infer<typeof PreVisitSummarySchema>;

const PRE_VISIT_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    urgency: URGENCY_ENUM,
    chiefComplaint: { type: "string" },
    suggestedQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["urgency", "chiefComplaint", "suggestedQuestions"],
};

export async function generatePreVisitSummary(symptoms: string): Promise<LlmResult<PreVisitSummary>> {
  if (!getProvider()) {
    // No API key configured — fall back to the local rule-based triage
    // engine rather than failing outright. This is a deliberate upgrade
    // over "no key = error": the booking flow always gets a usable urgency
    // triage, just clearly labeled as not LLM-generated.
    return { ok: true, data: runLocalTriage(symptoms), source: "LOCAL" };
  }

  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}`;
  return callLlm(prompt, PreVisitSummarySchema, PRE_VISIT_GEMINI_SCHEMA, 1024);
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

const POST_VISIT_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    patientSummary: { type: "string" },
    medicationSchedule: {
      type: "array",
      items: {
        type: "object",
        properties: {
          medicationName: { type: "string" },
          dosage: { type: "string" },
          frequency: { type: "string" },
          intervalHours: { type: "integer" },
          durationDays: { type: "integer" },
        },
        required: ["medicationName", "frequency", "intervalHours"],
      },
    },
    followUpSteps: { type: "array", items: { type: "string" } },
  },
  required: ["patientSummary", "medicationSchedule", "followUpSteps"],
};

export async function generatePostVisitSummary(
  doctorNotes: string,
  prescription: string
): Promise<LlmResult<PostVisitSummary>> {
  if (!getProvider()) {
    // No API key — fall back to the local prescription parser (regex over
    // dosage/frequency/duration patterns) rather than failing outright.
    return { ok: true, data: buildLocalPostVisitSummary(doctorNotes, prescription), source: "LOCAL" };
  }

  const notes = `Doctor notes: ${doctorNotes}\nPrescription: ${prescription}`;
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}\n\nFor each medication, also give a normalized reminder interval in hours (e.g. "twice daily" -> 12, "every 8 hours" -> 8, "once daily" -> 24) and, if a course length is mentioned, its duration in days.`;
  return callLlm(prompt, PostVisitSummarySchema, POST_VISIT_GEMINI_SCHEMA, 1536);
}

// ── Standalone symptom checker ───────────────────────────────────────────
// A self-serve "what might this be" tool for patients, separate from the
// booking flow's pre-visit triage above. Falls back to the local
// symptom-database/symptom-checker match engine (a static knowledge base,
// not a trained model — see symptom-database.ts) when no API key is
// configured. Same rule as everywhere else in this file: the `source` field
// must always reach the UI so it never gets displayed as "AI" when it was
// actually the local knowledge base.

const PossibleConditionSchema = z.object({
  name: z.string(),
  urgency: z.enum(["Low", "Medium", "High"]),
  explanation: z.string(),
  recommendedAction: z.string(),
});

const SymptomCheckSchema = z.object({
  overallUrgency: z.enum(["Low", "Medium", "High"]),
  possibleConditions: z.array(PossibleConditionSchema).max(5),
  disclaimer: z.string(),
});
export type SymptomCheckSummary = z.infer<typeof SymptomCheckSchema>;

const SYMPTOM_CHECK_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    overallUrgency: URGENCY_ENUM,
    possibleConditions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          urgency: URGENCY_ENUM,
          explanation: { type: "string" },
          recommendedAction: { type: "string" },
        },
        required: ["name", "urgency", "explanation", "recommendedAction"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: ["overallUrgency", "possibleConditions", "disclaimer"],
};

const NO_MATCH_DISCLAIMER =
  "No close matches were found in the local symptom-condition knowledge base for what you described. This is an informational self-check only, not a medical diagnosis — please book an appointment so a doctor can take a proper look.";
const LOCAL_DISCLAIMER =
  "This result is generated by matching your symptoms against a local knowledge base of common symptoms and conditions — it is not a live AI analysis and not a medical diagnosis. Please book an appointment for a proper evaluation.";

export async function generateSymptomCheck(symptoms: string): Promise<LlmResult<SymptomCheckSummary>> {
  if (!getProvider()) {
    const local = checkSymptoms(symptoms);
    if (local.matches.length === 0) {
      return {
        ok: true,
        source: "LOCAL",
        data: { overallUrgency: "Low", possibleConditions: [], disclaimer: NO_MATCH_DISCLAIMER },
      };
    }
    return {
      ok: true,
      source: "LOCAL",
      data: {
        overallUrgency: local.overallUrgency ?? "Low",
        possibleConditions: local.matches.map((m) => ({
          name: m.name,
          urgency: m.urgency,
          explanation: m.description,
          recommendedAction: m.advice,
        })),
        disclaimer: LOCAL_DISCLAIMER,
      },
    };
  }

  const prompt = `A patient describes these symptoms: ${symptoms}\n\nList up to 5 possible (non-diagnostic) conditions that could explain these symptoms, each with an urgency level (Low/Medium/High), a brief plain-language explanation, and a recommended next action. Also give an overall urgency level and a clear disclaimer stating this is not a medical diagnosis.`;
  return callLlm(prompt, SymptomCheckSchema, SYMPTOM_CHECK_GEMINI_SCHEMA, 1536);
}
