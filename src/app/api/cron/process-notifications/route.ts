import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/require-cron-secret";
import { processNotificationQueue } from "@/lib/process-notifications";

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const result = await processNotificationQueue();
  return NextResponse.json(result);
}
