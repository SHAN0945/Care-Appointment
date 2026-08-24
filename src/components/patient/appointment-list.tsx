"use client";

import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/date-utils";

type Appointment = {
  id: string;
  slotStart: string;
  status: string;
  doctor: { specialization: string; user: { name: string } };
  symptomForm: { aiUrgency: string | null; aiSummaryFailed: boolean; aiSource: string | null } | null;
  visitNotes: { aiPatientSummary: string | null; aiSummaryFailed: boolean; aiSource: string | null } | null;
};

function sourceLabel(source: string | null): string | null {
  if (source === "LLM") return "✨ Claude AI";
  if (source === "LOCAL") return "🤖 Local triage engine";
  return null;
}

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
      <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        No appointments yet — book one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Pre-visit AI summary:{" "}
              {a.symptomForm.aiSummaryFailed
                ? "unavailable (AI summary failed — your symptoms were still recorded)"
                : `urgency ${a.symptomForm.aiUrgency ?? "—"}`}
              {!a.symptomForm.aiSummaryFailed && sourceLabel(a.symptomForm.aiSource) && (
                <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">({sourceLabel(a.symptomForm.aiSource)})</span>
              )}
            </p>
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
