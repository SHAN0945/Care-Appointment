import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/require-cron-secret";
import { dispatchMedicationReminders } from "@/lib/medication-dispatch";

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const result = await dispatchMedicationReminders();
  return NextResponse.json(result);
}
