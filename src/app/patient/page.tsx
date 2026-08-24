import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { getPatientProfileId } from "@/lib/current-user";
import { formatDate, formatTime } from "@/lib/date-utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

const QUICK_ACTIONS = [
  { href: "/patient/book", icon: "🔍", label: "Find a doctor", body: "Search by specialty and book instantly" },
  { href: "/patient/appointments", icon: "📅", label: "My appointments", body: "View history and visit summaries" },
  { href: "/patient/settings", icon: "📆", label: "Calendar sync", body: "Connect Google Calendar" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function PatientDashboard() {
  const session = await auth();
  const patientId = session?.user?.id ? await getPatientProfileId(session.user.id) : null;

  const [nextAppointment, upcomingCount, completedCount] = patientId
    ? await Promise.all([
        prisma.appointment.findFirst({
          where: { patientId, status: { in: ["PENDING", "CONFIRMED"] }, slotStart: { gte: new Date() } },
          orderBy: { slotStart: "asc" },
          include: { doctor: { select: { specialization: true, user: { select: { name: true } } } } },
        }),
        prisma.appointment.count({
          where: { patientId, status: { in: ["PENDING", "CONFIRMED"] }, slotStart: { gte: new Date() } },
        }),
        prisma.appointment.count({ where: { patientId, status: "COMPLETED" } }),
      ])
    : [null, 0, 0];

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <AppShell role="PATIENT" email={session?.user?.email} title={`${greeting()}, ${firstName}`} subtitle="Your care, all in one place.">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{upcomingCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{completedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completed visits</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Next appointment</p>
        {nextAppointment ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{nextAppointment.doctor.user.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{nextAppointment.doctor.specialization}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {formatDate(nextAppointment.slotStart)} · {formatTime(nextAppointment.slotStart)}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[nextAppointment.status]}`}>
              {nextAppointment.status === "CONFIRMED" ? "✓ Confirmed" : "Awaiting confirmation"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming appointments booked yet.</p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <a
          href="/patient/book"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          + Book appointment
        </a>
        <a
          href="/patient/appointments"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          View all appointments{upcomingCount > 0 ? ` (${upcomingCount} upcoming)` : ""}
        </a>
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Quick links</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg dark:bg-emerald-900/30">
              {a.icon}
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{a.label}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{a.body}</p>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
