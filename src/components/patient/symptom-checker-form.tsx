"use client";

import { useState } from "react";
import { SYMPTOM_CATEGORIES } from "@/lib/symptom-database";

type PossibleCondition = {
  name: string;
  urgency: "Low" | "Medium" | "High";
  explanation: string;
  recommendedAction: string;
};

type CheckResult = {
  overallUrgency: "Low" | "Medium" | "High";
  possibleConditions: PossibleCondition[];
  disclaimer: string;
  source: "LLM" | "LOCAL";
  recognizedSymptoms: string[];
};

const URGENCY_STYLES: Record<string, string> = {
  Low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  High: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function sourceLabel(source: "LLM" | "LOCAL") {
  return source === "LLM" ? "✨ AI-generated" : "🤖 Local knowledge base (300+ symptoms & conditions)";
}

const CATEGORY_ENTRIES = Object.entries(SYMPTOM_CATEGORIES);

export function SymptomCheckerForm() {
  const [symptoms, setSymptoms] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addSymptom(word: string) {
    setSymptoms((prev) => {
      if (prev.toLowerCase().includes(word.toLowerCase())) return prev;
      if (!prev.trim()) return word;
      const sep = /[.,;]\s*$/.test(prev.trim()) ? " " : ", ";
      return `${prev.trim()}${sep}${word}`;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/patient/symptom-checker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong — please try again.");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
        <strong>Not a medical diagnosis.</strong> This tool gives an informational self-check to help you decide
        whether — and how urgently — to see a doctor. Always book an appointment for anything that concerns you.
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-xl p-6 shadow-sm dark:border-white/10 dark:bg-gray-900/50">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-50">Describe your symptoms</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Type freely, or tap symptoms below to add them. The more detail, the better the result.
        </p>

        <div className="mb-4 space-y-2">
          {CATEGORY_ENTRIES.map(([category, symptomsInCategory]) => (
            <div key={category} className="rounded-md border border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setOpenCategory((c) => (c === category ? null : category))}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {category}
                <span className="text-gray-400 dark:text-gray-500">{openCategory === category ? "−" : "+"}</span>
              </button>
              {openCategory === category && (
                <div className="flex flex-wrap gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
                  {symptomsInCategory.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSymptom(s)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <label htmlFor="symptom-checker-input" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Your symptoms
        </label>
        <textarea
          id="symptom-checker-input"
          required
          rows={5}
          maxLength={4000}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="e.g. Sore throat and fever for 2 days, painful to swallow, feeling very tired..."
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
        />
        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">{symptoms.length}/4000</p>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !symptoms.trim()}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Check my symptoms"}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-xl p-6 shadow-sm dark:border-white/10 dark:bg-gray-900/50">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Results</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{sourceLabel(result.source)}</span>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${URGENCY_STYLES[result.overallUrgency]}`}>
              {result.overallUrgency} urgency overall
            </span>
          </div>

          {result.recognizedSymptoms.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Symptoms we picked up
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.recognizedSymptoms.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.possibleConditions.length === 0 ? (
            <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              No specific matches found for these symptoms — that doesn&apos;t rule anything out. If something feels
              wrong, book an appointment and describe it directly to a doctor.
            </p>
          ) : (
            <div className="space-y-3">
              {result.possibleConditions.map((c, i) => (
                <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[c.urgency]}`}>
                      {c.urgency}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{c.explanation}</p>
                  <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Suggested next step:</span>{" "}
                    {c.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">{result.disclaimer}</p>

          <a
            href="/patient/book"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Book an appointment
          </a>
        </div>
      )}
    </div>
  );
}
