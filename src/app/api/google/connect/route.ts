import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/google-calendar";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google Calendar isn't configured on this deployment yet" }, { status: 503 });
  }

  const state = randomBytes(16).toString("hex");
  const url = getGoogleAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
