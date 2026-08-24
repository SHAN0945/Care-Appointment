import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Recent-activity feed for the notification bell. Only EMAIL-type rows are
// returned — every notifiable event queues an EMAIL row and (often) a
// CALENDAR row for the same thing, so showing both would duplicate every
// entry in the list for no benefit to what the user actually sees.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notificationLog.findMany({
    where: { recipientId: session.user.id, type: "EMAIL" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      appointment: {
        select: {
          slotStart: true,
          doctor: { select: { user: { select: { name: true } } } },
          patient: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      event: n.event,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
      slotStart: n.appointment?.slotStart.toISOString() ?? null,
      doctorName: n.appointment?.doctor.user.name ?? null,
      patientName: n.appointment?.patient.user.name ?? null,
      payload: n.payload,
    })),
  });
}
