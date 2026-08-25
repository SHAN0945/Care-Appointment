"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/date-utils";

type SymptomForm = {
  symptoms: string;
  aiUrgency: string | null;
  aiChiefComplaint: string | null;
  aiSuggestedQuestions: string[] | null;
  aiSummaryFailed: boolean;
  aiSource: string | null;
};

type VisitNotes = {
  doctorNotes: string;
  prescription: string;
  aiPatientSummary: string | null;
  aiSummaryFailed: boolean;
  aiSource: string | null;
};

function SourceBadge({ source }: { source: string | null }) {
  if (source === "LLM") {
    return <span className="text-xs font-normal text-purple-600 dark:text-purple-400">✨ AI-generated</span>;
  }
  if (source === "LOCAL") {
    return <span className="text-xs font-normal text-gray-500 dark:text-gray-400">🤖 Local triage engine</span>;
  }
  return null;
}

export type DoctorAppointment = {
  id: string;
  slotStart: string;
  status: string;
  patient: { user: { name: string } };
  symptomForm: SymptomForm | null;
  visitNotes: VisitNotes | null;
};

const URGENCY_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function DoctorAppointmentCard({ appointment }: { appointment: DoctorAppointment }) {
  const router = useRouter();
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitNotes(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/doctor/appointments/${appointment.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorNotes, prescription }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save notes");
      return;
    }
    setShowNotesForm(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.patient.user.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{formatDateTime(appointment.slotStart)}</p>
          <a
            href={`/api/doctor/appointments/${appointment.id}/ics`}
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            📅 Add to calendar
          </a>
        </div>
        <div className="flex items-center gap-2">
          {appointment.symptomForm?.aiUrgency && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                URGENCY_STYLES[appointment.symptomForm.aiUrgency] ?? ""
              }`}
            >
              {appointment.symptomForm.aiUrgency}
            </span>
          )}
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            {appointment.status}
          </span>
        </div>
      </div>

      {appointment.symptomForm && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-gray-900 dark:text-gray-100">Pre-visit summary</p>
            <SourceBadge source={appointment.symptomForm.aiSource} />
          </div>
          <p className="mb-2 text-gray-600 dark:text-gray-400">Reported symptoms: {appointment.symptomForm.symptoms}</p>
          {appointment.symptomForm.aiSummaryFailed ? (
            <p className="text-amber-600 dark:text-amber-400">AI summary unavailable — review symptoms above directly.</p>
          ) : (
            <>
              <p className="mb-1 text-gray-700 dark:text-gray-300">
                <strong className="text-gray-900 dark:text-gray-100">Chief complaint:</strong> {appointment.symptomForm.aiChiefComplaint}
              </p>
              {appointment.symptomForm.aiSuggestedQuestions && (
                <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                  {appointment.symptomForm.aiSuggestedQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {appointment.visitNotes ? (
        <div className="mt-3 rounded-md bg-green-50 p-3 text-sm dark:bg-green-900/20">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-gray-900 dark:text-gray-100">Visit notes submitted</p>
            <SourceBadge source={appointment.visitNotes.aiSource} />
          </div>
          <p className="text-gray-600 dark:text-gray-400">{appointment.visitNotes.doctorNotes}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Prescription: {appointment.visitNotes.prescription}</p>
          {appointment.visitNotes.aiSummaryFailed ? (
            <p className="mt-2 text-amber-600 dark:text-amber-400">AI patient-summary generation failed for this visit.</p>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-gray-100">Patient-friendly summary:</strong>{" "}
              {appointment.visitNotes.aiPatientSummary}
            </p>
          )}
        </div>
      ) : appointment.status === "CONFIRMED" ? (
        showNotesForm ? (
          <form onSubmit={submitNotes} className="mt-3 space-y-2">
            <textarea
              required
              rows={3}
              aria-label="Clinical notes"
              placeholder="Clinical notes"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
            />
            <textarea
              required
              rows={2}
              aria-label="Prescription"
              placeholder="Prescription (medication, dosage, frequency, duration)"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
            />
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save & complete visit"}
              </button>
              <button
                type="button"
                onClick={() => setShowNotesForm(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNotesForm(true)}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Add post-visit notes
          </button>
        )
      ) : null}
    </div>
  );
}
