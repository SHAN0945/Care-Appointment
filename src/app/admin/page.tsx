import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { AddDoctorForm } from "@/components/admin/add-doctor-form";
import { DoctorCard, DoctorWithLeaves } from "@/components/admin/doctor-card";
import { WorkingHours } from "@/lib/working-hours";

export default async function AdminDashboard() {
  const session = await auth();

  const [doctorsRaw, patients, appointments, upcoming] = await Promise.all([
    prisma.doctorProfile.findMany({
      include: {
        user: { select: { name: true, email: true } },
        leaves: { orderBy: { date: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.patientProfile.count(),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, slotStart: { gte: new Date() } },
    }),
  ]);

  const doctors: DoctorWithLeaves[] = doctorsRaw.map((d) => ({
    id: d.id,
    specialization: d.specialization,
    slotDurationMinutes: d.slotDurationMinutes,
    workingHours: d.workingHours as WorkingHours,
    user: d.user,
    leaves: d.leaves.map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      reason: l.reason,
    })),
  }));

  const stats = [
    { label: "Patients", value: patients },
    { label: "Doctors", value: doctors.length },
    { label: "Appointments", value: appointments },
    { label: "Upcoming", value: upcoming },
  ];

  return (
    <AppShell role="ADMIN" email={session?.user?.email} title="Clinic overview">
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <AddDoctorForm />
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Clinical team</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{doctors.length} total</span>
      </div>
      <div className="space-y-4">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
        {doctors.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            No doctors yet — add one above.
          </p>
        )}
      </div>
    </AppShell>
  );
}
