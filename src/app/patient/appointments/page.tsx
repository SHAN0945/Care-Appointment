import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { AppointmentList } from "@/components/patient/appointment-list";
import { getPatientProfileId } from "@/lib/current-user";

export default async function PatientAppointmentsPage() {
  const session = await auth();
  const patientId = session?.user?.id ? await getPatientProfileId(session.user.id) : null;

  const appointments = patientId
    ? await prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: { select: { specialization: true, user: { select: { name: true } } } },
          symptomForm: {
            select: {
              aiUrgency: true,
              aiChiefComplaint: true,
              aiSuggestedQuestions: true,
              aiSummaryFailed: true,
              aiSource: true,
            },
          },
          visitNotes: { select: { aiPatientSummary: true, aiSummaryFailed: true, aiSource: true } },
        },
        orderBy: { slotStart: "desc" },
      })
    : [];

  return (
    <AppShell role="PATIENT" email={session?.user?.email} title="Appointments">
      <AppointmentList
        appointments={appointments.map((a) => ({
          ...a,
          slotStart: a.slotStart.toISOString(),
          symptomForm: a.symptomForm
            ? { ...a.symptomForm, aiSuggestedQuestions: a.symptomForm.aiSuggestedQuestions as string[] | null }
            : null,
        }))}
      />
    </AppShell>
  );
}
