import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { BookingFlow } from "@/components/patient/booking-flow";
import { WorkingHours } from "@/lib/working-hours";

export default async function BookAppointmentPage() {
  const session = await auth();

  const doctorsRaw = await prisma.doctorProfile.findMany({
    select: {
      id: true,
      specialization: true,
      bio: true,
      slotDurationMinutes: true,
      workingHours: true,
      user: { select: { name: true } },
    },
    orderBy: { specialization: "asc" },
  });

  const doctors = doctorsRaw.map((d) => ({ ...d, workingHours: d.workingHours as WorkingHours }));

  return (
    <AppShell role="PATIENT" email={session?.user?.email} title="Book an appointment">
      <BookingFlow initialDoctors={doctors} />
    </AppShell>
  );
}
