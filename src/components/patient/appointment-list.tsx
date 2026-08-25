"use client";

import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/date-utils";

type Appointment = {
  id: string;
  slotStart: string;
  status: string;
  doctor: { specialization: string; user: { name: string } };
  symptomForm: {
    aiUrgency: string | null;
    aiChiefComplaint: string | null;
    aiSuggestedQuestions: string[] | null;
    aiSummaryFailed: boolean;
    aiSource: string | null;
  } | null;
  visitNotes: { aiPatientSummary: string | null; aiSummaryFailed: boolean; aiSource: string | null } | null;
};

function sourceLabel(source: string | null): string | null {
  if (source === "LLM") return "✨ AI-generated";
  if (source === "LOCAL") return "🤖 Local triage engine";
  return null;
}

const URGENCY_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  const router = useRouter();

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    await fetch(`/api/patient/appointments/${id}/cancel`, { method: "POST" });
    router.refresh();
  }

  if (appointments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300/70 bg-white/30 backdrop-blur-xl p-8 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-gray-900/30 dark:text-gray-400">
        No appointments yet — book one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <div key={a.id} className="rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {a.doctor.user.name}{" "}
                <span className="font-normal text-gray-500 dark:text-gray-400">— {a.doctor.specialization}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatDateTime(a.slotStart)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
              {a.status}
            </span>
          </div>

          {a.symptomForm && (
            <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-gray-100">Symptom analysis</p>
                {!a.symptomForm.aiSummaryFailed && sourceLabel(a.symptomForm.aiSource) && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{sourceLabel(a.symptomForm.aiSource)}</span>
                )}
              </div>
              {a.symptomForm.aiSummaryFailed ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Analysis unavailable — your symptoms were still recorded and your doctor can see them.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        URGENCY_STYLES[a.symptomForm.aiUrgency ?? ""] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {a.symptomForm.aiUrgency ?? "—"} urgency
                    </span>
                  </div>
                  {a.symptomForm.aiChiefComplaint && (
                    <p className="mb-1 text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Chief complaint:</span>{" "}
                      {a.symptomForm.aiChiefComplaint}
                    </p>
                  )}
                  {a.symptomForm.aiSuggestedQuestions && a.symptomForm.aiSuggestedQuestions.length > 0 && (
                    <>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Consider asking your doctor
                      </p>
                      <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                        {a.symptomForm.aiSuggestedQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {a.visitNotes && (
            <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-gray-100">Visit summary</p>
                {!a.visitNotes.aiSummaryFailed && sourceLabel(a.visitNotes.aiSource) && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{sourceLabel(a.visitNotes.aiSource)}</span>
                )}
              </div>
              {a.visitNotes.aiSummaryFailed || !a.visitNotes.aiPatientSummary ? (
                <p className="text-gray-500 dark:text-gray-400">AI summary unavailable — ask your doctor for details.</p>
              ) : (
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{a.visitNotes.aiPatientSummary}</p>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4">
            {(a.status === "CONFIRMED" || a.status === "COMPLETED") && (
              <a
                href={`/api/patient/appointments/${a.id}/ics`}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                📅 Add to calendar
              </a>
            )}
            {(a.status === "PENDING" || a.status === "CONFIRMED") && (
              <button
                onClick={() => cancel(a.id)}
                className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Cancel appointment
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
