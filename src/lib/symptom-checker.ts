import { COMMON_SYMPTOMS, CONDITIONS, Urgency } from "@/lib/symptom-database";

// Local, rule-based "symptom checker" matcher — scans free-text (plus any
// explicitly picked quick-add chips) for known symptom phrases, then scores
// each condition in the local knowledge base by how much of its symptom
// profile the patient matches. This is deliberately simple keyword/overlap
// matching, not a trained classifier — see symptom-database.ts for why, and
// keep it that way: never dress this up as more than it is in the UI.

export type ConditionMatch = {
  name: string;
  category: string;
  urgency: Urgency;
  description: string;
  advice: string;
  matchedSymptoms: string[];
  confidence: number; // 0-100, heuristic — not a calibrated probability
};

export type SymptomCheckResult = {
  recognizedSymptoms: string[];
  matches: ConditionMatch[];
  overallUrgency: Urgency | null; // highest urgency among the returned matches
};

const MAX_MATCHES = 5;

function extractSymptoms(freeText: string, extraSymptoms: string[]): Set<string> {
  const recognized = new Set<string>();
  const lowerText = freeText.toLowerCase();

  for (const symptom of COMMON_SYMPTOMS) {
    if (lowerText.includes(symptom)) recognized.add(symptom);
  }
  for (const raw of extraSymptoms) {
    const normalized = raw.toLowerCase().trim();
    if (COMMON_SYMPTOMS.includes(normalized)) recognized.add(normalized);
  }
  return recognized;
}

const URGENCY_RANK: Record<Urgency, number> = { Low: 0, Medium: 1, High: 2 };

export function checkSymptoms(freeText: string, extraSymptoms: string[] = []): SymptomCheckResult {
  const recognized = extractSymptoms(freeText, extraSymptoms);

  const matches: ConditionMatch[] = [];
  for (const condition of CONDITIONS) {
    const matched = condition.symptoms.filter((s) => recognized.has(s));
    if (matched.length === 0) continue;

    // Weight toward matching a larger fraction of the condition's defining
    // symptoms, with a smaller bonus for absolute overlap so a 2/2 match
    // doesn't automatically outrank a broader 4/6 match.
    const coverage = matched.length / condition.symptoms.length;
    const confidence = Math.round(Math.min(100, coverage * 70 + matched.length * 8));

    matches.push({
      name: condition.name,
      category: condition.category,
      urgency: condition.urgency,
      description: condition.description,
      advice: condition.advice,
      matchedSymptoms: matched,
      confidence,
    });
  }

  matches.sort((a, b) => b.confidence - a.confidence || b.matchedSymptoms.length - a.matchedSymptoms.length);
  const top = matches.slice(0, MAX_MATCHES);

  // Any red-flag (High urgency) condition appearing at all in the top
  // results should dominate the overall urgency shown to the patient —
  // safety-critical possibilities shouldn't get buried under a higher
  // confidence score from something mundane.
  const overallUrgency =
    top.length === 0
      ? null
      : top.reduce<Urgency>((acc, m) => (URGENCY_RANK[m.urgency] > URGENCY_RANK[acc] ? m.urgency : acc), top[0].urgency);

  return {
    recognizedSymptoms: Array.from(recognized),
    matches: top,
    overallUrgency,
  };
}
