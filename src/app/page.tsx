import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { formatWorkingHours, WorkingHours } from "@/lib/working-hours";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  PATIENT: "/patient",
};

const SPECIALTY_ICONS: Record<string, string> = {
  "General Physician": "🩺",
  Cardiology: "❤️",
  Pediatrics: "🧸",
  Dermatology: "🧴",
  Orthopedics: "🦴",
};

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Search & book",
    body: "Find a doctor by specialty, pick an open slot on the calendar — booked instantly, with double-booking prevented at the database level.",
    icon: "🔍",
  },
  {
    step: "2",
    title: "Share your symptoms",
    body: "A quick form before your visit — no waiting room small talk needed.",
    icon: "📝",
  },
  {
    step: "3",
    title: "Your doctor gets ready",
    body: "An AI-generated urgency triage, chief complaint, and suggested questions land on your doctor's screen before you walk in.",
    icon: "✨",
  },
  {
    step: "4",
    title: "Leave with a plan",
    body: "A plain-language visit summary, medication schedule, and automatic reminders — synced to your email and calendar.",
    icon: "📅",
  },
];

const FEATURES = [
  { icon: "✨", title: "AI symptom triage", body: "Every booking gets an urgency level, chief complaint, and doctor-ready questions before the visit." },
  { icon: "🔒", title: "Conflict-proof scheduling", body: "A partial unique index at the database layer makes double-booking structurally impossible, even under concurrent requests." },
  { icon: "📅", title: "Google Calendar sync", body: "Confirmed appointments appear on both your and your doctor's calendar automatically, and clean up on cancellation." },
  { icon: "✉️", title: "Email, handled reliably", body: "Confirmations, reminders, and cancellations are queued and retried automatically — a slow provider never blocks your booking." },
  { icon: "💊", title: "Medication reminders", body: "Prescriptions are parsed into a real reminder schedule, no manual tracking required." },
  { icon: "🗂️", title: "Role-based portals", body: "Separate, purpose-built experiences for patients, doctors, and clinic admins." },
];

export default async function Home() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(ROLE_HOME[session.user.role] ?? "/login");
  }

  const [doctorsRaw, appointmentCount] = await Promise.all([
    prisma.doctorProfile.findMany({
      select: {
        id: true,
        specialization: true,
        bio: true,
        slotDurationMinutes: true,
        workingHours: true,
        user: { select: { name: true } },
      },
      orderBy: { specialization: "asc" },
    }),
    prisma.appointment.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
  ]);
  const doctors = doctorsRaw.map((d) => ({ ...d, workingHours: d.workingHours as WorkingHours }));

  const specialtyCounts = new Map<string, number>();
  for (const d of doctors) specialtyCounts.set(d.specialization, (specialtyCounts.get(d.specialization) ?? 0) + 1);
  const specialties = Array.from(specialtyCounts.entries());

  const stats = [
    { value: String(doctors.length), label: "Verified doctors" },
    { value: String(specialties.length), label: "Specialties covered" },
    { value: String(appointmentCount), label: "Appointments booked" },
    { value: "24/7", label: "AI pre-visit triage" },
  ];

  return (
    <div className="bg-white dark:bg-gray-950">
      <LandingHeader />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-blue-100 opacity-60 blur-3xl dark:bg-blue-900/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-100 opacity-50 blur-3xl dark:bg-emerald-900/20"
        />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800">
              ✨ AI-assisted care, start to finish
            </span>
            <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl dark:text-gray-50">
              Healthcare appointments,<br />
              <span className="text-blue-600 dark:text-blue-400">actually prepared for.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-gray-600 dark:text-gray-400">
              Book with the right doctor in minutes. Share your symptoms ahead of time. Get a
              plain-language summary and medication reminders after — automatically.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/register"
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Book your first appointment
              </a>
              <a
                href="#how-it-works"
                className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                See how it works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <span>🔐 Role-based, secure portals</span>
              <span>⚡ Instant slot confirmation</span>
              <span>📆 Calendar &amp; email sync</span>
            </div>
          </div>

          {/* Product-accurate mock preview, not a stock illustration */}
          <div className="relative">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Next appointment</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">✓ Confirmed</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">Dr. Priya Sharma</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">General Physician</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Tomorrow · 10:30 AM</p>
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">AI PRE-VISIT SUMMARY</p>
                <span className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Urgency: Medium
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Fever and headache for two days</p>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-5 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">💊 Reminder</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Paracetamol — 8:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">From booking to follow-up, in one flow</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">No app-switching, no lost paperwork — everything the visit needs, automatically coordinated.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-xl dark:bg-blue-900/30">{s.icon}</span>
              <p className="mb-1 text-xs font-semibold text-blue-600 dark:text-blue-400">STEP {s.step}</p>
              <p className="mb-1.5 font-semibold text-gray-900 dark:text-gray-50">{s.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Specialties ──────────────────────────────────────────────── */}
      <section id="specialties" className="bg-gray-50 py-20 dark:bg-gray-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Find care by specialty</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Search real availability, not a call center queue.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specialties.map(([name, count]) => (
              <a
                key={name}
                href="/login/patient"
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700 dark:shadow-none"
              >
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-2xl dark:bg-blue-900/30">
                  {SPECIALTY_ICONS[name] ?? "🩺"}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{count} doctor{count === 1 ? "" : "s"} available</p>
                </div>
              </a>
            ))}
            {specialties.length === 0 && (
              <p className="col-span-full text-center text-gray-500 dark:text-gray-400">Doctors are being added — check back soon.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured doctors ─────────────────────────────────────────── */}
      <section id="doctors" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Meet our doctors</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Real working hours, real availability — no phone tag required.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl dark:bg-blue-900/30">
                👩‍⚕️
              </span>
              <p className="font-semibold text-gray-900 dark:text-gray-50">{doc.user.name}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">{doc.specialization}</p>
              {doc.bio && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{doc.bio}</p>}
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                {formatWorkingHours(doc.workingHours)} · {doc.slotDurationMinutes} min slots
              </p>
              <a
                href="/login/patient"
                className="mt-4 inline-block rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Book now
              </a>
            </div>
          ))}
          {doctors.length === 0 && (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">Doctors are being added — check back soon.</p>
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-20 dark:bg-gray-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Why CareFlow</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Built to remove the busywork around a visit, not just the booking form.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-xl dark:bg-blue-900/30">{f.icon}</span>
                <p className="mb-1.5 font-semibold text-gray-900 dark:text-gray-50">{f.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl bg-blue-600 px-8 py-14 text-center shadow-lg sm:px-16">
          <h2 className="text-3xl font-bold text-white">Ready when you are.</h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Create a free patient account and book your first appointment in under two minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/register"
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Get started free
            </a>
            <a
              href="/login/doctor"
              className="rounded-md border border-blue-300 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              I'm a doctor
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
