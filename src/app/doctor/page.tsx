import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { DoctorAppointmentCard, DoctorAppointment } from "@/components/doctor/appointment-card";
import { getDoctorProfileId } from "@/lib/current-user";

function toCardAppointment(a: {
  id: string;
  slotStart: Date;
  status: string;
  patient: { user: { name: string } };
  symptomForm: {
    symptoms: string;
    aiUrgency: string | null;
    aiChiefComplaint: string | null;
    aiSuggestedQuestions: unknown;
    aiSummaryFailed: boolean;
    aiSource: string | null;
  } | null;
  visitNotes: {
    doctorNotes: string;
    prescription: string;
    aiPatientSummary: string | null;
    aiSummaryFailed: boolean;
    aiSource: string | null;
  } | null;
}): DoctorAppointment {
  return {
    id: a.id,
    slotStart: a.slotStart.toISOString(),
    status: a.status,
    patient: a.patient,
    symptomForm: a.symptomForm
      ? {
          symptoms: a.symptomForm.symptoms,
          aiUrgency: a.symptomForm.aiUrgency,
          aiChiefComplaint: a.symptomForm.aiChiefComplaint,
          aiSuggestedQuestions: a.symptomForm.aiSuggestedQuestions as string[] | null,
          aiSummaryFailed: a.symptomForm.aiSummaryFailed,
          aiSource: a.symptomForm.aiSource,
        }
      : null,
    visitNotes: a.visitNotes
      ? {
          doctorNotes: a.visitNotes.doctorNotes,
          prescription: a.visitNotes.prescription,
          aiPatientSummary: a.visitNotes.aiPatientSummary,
          aiSummaryFailed: a.visitNotes.aiSummaryFailed,
          aiSource: a.visitNotes.aiSource,
        }
      : null,
  };
}

export default async function DoctorDashboard() {
  const session = await auth();
  const doctorId = session?.user?.id ? await getDoctorProfileId(session.user.id) : null;

  const appointments = doctorId
    ? await prisma.appointment.findMany({
        where: { doctorId, status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: {
          patient: { select: { user: { select: { name: true } } } },
          symptomForm: true,
          visitNotes: true,
        },
        orderBy: { slotStart: "asc" },
      })
    : [];

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const today = appointments.filter((a) => a.slotStart >= todayStart && a.slotStart <= todayEnd);
  const rest = appointments.filter((a) => !(a.slotStart >= todayStart && a.slotStart <= todayEnd));
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const awaitingNotesCount = appointments.filter(
    (a) => a.status === "CONFIRMED" && a.slotStart < now && !a.visitNotes
  ).length;

  const name = session?.user?.name;

  return (
    <AppShell
      role="DOCTOR"
      email={session?.user?.email}
      title={name ? `Welcome, ${name}` : "My appointments"}
      subtitle={`${today.length} patient${today.length === 1 ? "" : "s"} today`}
    >
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl p-3 dark:border-white/10 dark:bg-gray-900/50">
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{today.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
        </div>
        <div className="rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl p-3 dark:border-white/10 dark:bg-gray-900/50">
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{completedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completed visits</p>
        </div>
        <div className="rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl p-3 dark:border-white/10 dark:bg-gray-900/50">
          <p className={`text-xl font-semibold ${awaitingNotesCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-50"}`}>
            {awaitingNotesCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Awaiting notes</p>
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Today&apos;s patients</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{today.length}</span>
      </div>
      <div className="mb-8 space-y-4">
        {today.map((a) => (
          <DoctorAppointmentCard key={a.id} appointment={toCardAppointment(a)} />
        ))}
        {today.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300/70 bg-white/30 backdrop-blur-xl p-6 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-gray-900/30 dark:text-gray-400">
            No patients scheduled for today.
          </p>
        )}
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Upcoming &amp; past</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{rest.length}</span>
      </div>
      <div className="space-y-4">
        {rest.map((a) => (
          <DoctorAppointmentCard key={a.id} appointment={toCardAppointment(a)} />
        ))}
        {rest.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300/70 bg-white/30 backdrop-blur-xl p-6 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-gray-900/30 dark:text-gray-400">
            Nothing else scheduled.
          </p>
        )}
      </div>
    </AppShell>
  );
}
