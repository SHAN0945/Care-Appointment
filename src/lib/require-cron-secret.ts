import { NextResponse } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically when
 * CRON_SECRET is set as a project env var — this checks that header so the
 * route can't be triggered by anyone who finds the URL. If CRON_SECRET isn't
 * configured at all we allow the request through (so local dev works without
 * setting it) but log a warning; **always set CRON_SECRET in production**.
 */
export function requireCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("CRON_SECRET is not set — this cron route is currently unprotected.");
    return null;
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
