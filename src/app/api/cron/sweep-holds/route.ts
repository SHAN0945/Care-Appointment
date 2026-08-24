import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/require-cron-secret";
import { sweepExpiredHolds } from "@/lib/hold-sweep";

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const result = await sweepExpiredHolds();
  return NextResponse.json(result);
}
