"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkingHours, formatWorkingHours } from "@/lib/working-hours";
import { formatDateTime, formatTime } from "@/lib/date-utils";
import { Calendar } from "@/components/calendar";
import { Stepper } from "@/components/stepper";

type Doctor = {
  id: string;
  specialization: string;
  bio: string | null;
  slotDurationMinutes: number;
  workingHours?: WorkingHours;
  user: { name: string };
};

type Slot = { start: string; end: string };

type SymptomAnalysis = {
  aiUrgency: string | null;
  aiChiefComplaint: string | null;
  aiSuggestedQuestions: string[] | null;
  aiSummaryFailed: boolean;
  aiSource: string | null;
};

const URGENCY_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function sourceLabel(source: string | null): string | null {
  if (source === "LLM") return "✨ AI-generated";
  if (source === "LOCAL") return "🤖 Local triage engine";
  return null;
}

const STEPS = [
  { label: "Doctor", icon: "1" },
  { label: "Date & Time", icon: "2" },
  { label: "Symptoms", icon: "3" },
  { label: "Confirmed", icon: "4" },
];

// Matches HOLD_DURATION_MINUTES in src/lib/constants.ts — the server is the
// real source of truth (a stale client countdown never blocks the actual
// confirm request), this is purely so the patient can see the clock running.
const HOLD_MINUTES = 5;

const QUICK_SYMPTOMS = [
  "Fever", "Headache", "Cough", "Sore throat", "Stomach pain",
  "Nausea", "Fatigue", "Body ache", "Dizziness", "Rash",
];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function useCountdown(expiresAt: number | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    // Set immediately rather than waiting for the first setInterval tick —
    // otherwise the countdown reads a stale "0:00" for up to a second right
    // after a slot is held, since expiresAt only just became non-null.
    setRemaining(expiresAt - Date.now());
    const id = setInterval(() => setRemaining(expiresAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const clamped = Math.max(0, remaining);
  const m = Math.floor(clamped / 60000);
  const s = Math.floor((clamped % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BookingFlow({ initialDoctors }: { initialDoctors: Doctor[] }) {
  const router = useRouter();

  const [specialization, setSpecialization] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [holdAppointmentId, setHoldAppointmentId] = useState<string | null>(null);
  const [holdSlot, setHoldSlot] = useState<Slot | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [symptomAnalysis, setSymptomAnalysis] = useState<SymptomAnalysis | null>(null);
  const [step, setStep] = useState<"search" | "slots" | "symptoms" | "done">("search");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const countdown = useCountdown(step === "symptoms" ? holdExpiresAt : null);
  const stepIndex = step === "search" ? 0 : step === "slots" ? 1 : step === "symptoms" ? 2 : 3;

  async function searchDoctors(e?: React.FormEvent) {
    e?.preventDefault();
    setLoadingDoctors(true);
    const qs = specialization ? `?specialization=${encodeURIComponent(specialization)}` : "";
    const res = await fetch(`/api/doctors${qs}`);
    const data = await res.json();
    setDoctors(data.doctors ?? []);
    setLoadingDoctors(false);
  }

  async function loadSlots(doctor: Doctor, d: string) {
    setSelectedDoctor(doctor);
    setDate(d);
    setStep("slots");
    setLoadingSlots(true);
    setError(null);
    const res = await fetch(`/api/doctors/${doctor.id}/slots?date=${d}`);
    const data = await res.json();
    setSlots(data.slots ?? []);
    setLoadingSlots(false);
  }

  // Selecting a doctor immediately loads today's slots — the previous
  // version only fetched slots from a date-input's onChange, so a doctor
  // whose default (already-filled) date a patient never touched showed zero
  // slots with no explanation. Now opening a doctor always fetches something.
  function selectDoctor(doc: Doctor) {
    if (selectedDoctor?.id === doc.id) {
      setSelectedDoctor(null);
      setStep("search");
      return;
    }
    loadSlots(doc, todayISODate());
  }

  async function holdSlotAndProceed(slot: Slot) {
    if (!selectedDoctor) return;
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/patient/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId: selectedDoctor.id, slotStart: slot.start }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That slot just became unavailable — pick another.");
      loadSlots(selectedDoctor, date);
      return;
    }
    const data = await res.json();
    setHoldAppointmentId(data.appointment.id);
    setHoldSlot(slot);
    setHoldExpiresAt(Date.now() + HOLD_MINUTES * 60_000);
    setStep("symptoms");
  }

  function addQuickSymptom(word: string) {
    setSymptoms((prev) => {
      if (prev.toLowerCase().includes(word.toLowerCase())) return prev;
      if (!prev.trim()) return word;
      const sep = /[.,;]\s*$/.test(prev.trim()) ? " " : ", ";
      return `${prev.trim()}${sep}${word.toLowerCase()}`;
    });
  }

  async function confirmBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!holdAppointmentId) return;
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/patient/appointments/${holdAppointmentId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to confirm booking");
      return;
    }
    const data = await res.json();
    setSymptomAnalysis(data.symptomForm ?? null);
    setStep("done");
  }

  return (
    <div>
      <Stepper steps={STEPS} currentIndex={stepIndex} />

      {step === "done" ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700 dark:bg-green-900/40 dark:text-green-400">
            ✓
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">Appointment confirmed</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Booked with {selectedDoctor?.user.name} on{" "}
            {holdSlot && formatDateTime(holdSlot.start)}.
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            A confirmation email is on its way, and your calendar will sync automatically.
          </p>

          {symptomAnalysis && (
            <div className="mx-auto mt-6 max-w-lg rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm dark:border-gray-800 dark:bg-gray-800">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-gray-100">Symptom analysis</p>
                {!symptomAnalysis.aiSummaryFailed && sourceLabel(symptomAnalysis.aiSource) && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{sourceLabel(symptomAnalysis.aiSource)}</span>
                )}
              </div>
              {symptomAnalysis.aiSummaryFailed ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Analysis unavailable — your symptoms were still recorded and your doctor can see them.
                </p>
              ) : (
                <>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      URGENCY_STYLES[symptomAnalysis.aiUrgency ?? ""] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {symptomAnalysis.aiUrgency ?? "—"} urgency
                  </span>
                  {symptomAnalysis.aiChiefComplaint && (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Chief complaint:</span>{" "}
                      {symptomAnalysis.aiChiefComplaint}
                    </p>
                  )}
                  {symptomAnalysis.aiSuggestedQuestions && symptomAnalysis.aiSuggestedQuestions.length > 0 && (
                    <>
                      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Consider asking your doctor
                      </p>
                      <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                        {symptomAnalysis.aiSuggestedQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <button
            onClick={() => router.push("/patient")}
            className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Go to my appointments
          </button>
        </div>
      ) : step === "search" || step === "slots" ? (
        <>
          <form onSubmit={searchDoctors} className="mb-6 flex gap-2">
            <input
              aria-label="Search by specialization"
              placeholder="Search by specialization (e.g. Cardiology)"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Search
            </button>
          </form>

          {loadingDoctors ? (
            <p className="text-gray-500 dark:text-gray-400">Loading doctors…</p>
          ) : (
            <div className="space-y-3">
              {doctors.map((doc) => {
                const expanded = selectedDoctor?.id === doc.id && step === "slots";
                return (
                  <div key={doc.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => selectDoctor(doc)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          <span className="mr-1.5">👩‍⚕️</span>
                          {doc.user.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{doc.specialization}</p>
                        {doc.bio && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{doc.bio}</p>}
                        {doc.workingHours && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {formatWorkingHours(doc.workingHours)} · {doc.slotDurationMinutes} min slots
                          </p>
                        )}
                      </div>
                      <span className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
                        {expanded ? "Hide" : "View availability"}
                      </span>
                    </button>

                    {expanded && (
                      <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row dark:border-gray-800">
                        <Calendar selected={date} onSelect={(d) => loadSlots(doc, d)} workingHours={doc.workingHours} />
                        <div className="flex-1">
                          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "long",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {loadingSlots ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading slots…</p>
                          ) : slots.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No available slots this day — try another date on the calendar.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {slots.map((s) => (
                                <button
                                  key={s.start}
                                  disabled={submitting}
                                  onClick={() => holdSlotAndProceed(s)}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                                >
                                  {formatTime(s.start)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {doctors.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  No doctors found.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-900/20">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Holding <strong>{selectedDoctor?.user.name}</strong> at{" "}
              <strong>{holdSlot && formatDateTime(holdSlot.start)}</strong>
            </p>
            {countdown && (
              <span className="flex-shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm dark:bg-gray-800 dark:text-blue-300">
                ⏱ {countdown}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">Tell us what's going on</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Our AI will prepare an urgency triage and suggested questions for your doctor before you arrive.
            </p>

            <form onSubmit={confirmBooking} className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Quick add</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SYMPTOMS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addQuickSymptom(s)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="symptoms" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Describe your symptoms</label>
                <textarea
                  id="symptoms"
                  required
                  rows={5}
                  maxLength={4000}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="What's been going on? When did it start? Anything that makes it better or worse?"
                />
                <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">{symptoms.length}/4000</p>
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !symptoms.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Confirming…" : "Confirm appointment"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("slots")}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
