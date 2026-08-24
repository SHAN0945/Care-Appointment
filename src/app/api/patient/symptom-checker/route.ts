import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/require-role";
import { generateSymptomCheck } from "@/lib/llm";
import { checkSymptoms } from "@/lib/symptom-checker";

const checkSchema = z.object({
  symptoms: z.string().trim().min(1).max(4000),
});

// Standalone self-check tool, distinct from the pre-visit triage that runs
// as part of booking an appointment. Nothing here is persisted — it's a
// stateless "what might this be" lookup a patient can run any time.
export async function POST(req: Request) {
  const { response } = await requireRole("PATIENT");
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [summary, recognized] = await Promise.all([
    generateSymptomCheck(parsed.data.symptoms),
    Promise.resolve(checkSymptoms(parsed.data.symptoms)),
  ]);

  if (!summary.ok) {
    return NextResponse.json({ error: summary.error }, { status: 502 });
  }

  return NextResponse.json({
    ...summary.data,
    source: summary.source,
    recognizedSymptoms: recognized.recognizedSymptoms,
  });
}
