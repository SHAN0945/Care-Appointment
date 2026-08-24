import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/require-cron-secret";
import { enqueueAppointmentReminders } from "@/lib/appointment-reminders";

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const result = await enqueueAppointmentReminders();
  return NextResponse.json(result);
}
