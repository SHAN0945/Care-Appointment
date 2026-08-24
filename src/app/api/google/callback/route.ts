import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCodeAndStore } from "@/lib/google-calendar";

const STATE_COOKIE = "google_oauth_state";
const ROLE_HOME: Record<string, string> = { ADMIN: "/admin", DOCTOR: "/doctor", PATIENT: "/patient" };

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const homePath = session?.user?.role ? ROLE_HOME[session.user.role] : "/login";
  const redirectWith = (status: "connected" | "error", message?: string) => {
    const url = new URL(homePath, req.url);
    url.searchParams.set("google", status);
    if (message) url.searchParams.set("message", message);
    return NextResponse.redirect(url);
  };

  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  if (error) return redirectWith("error", error);

  // CSRF check: state param must match the cookie set in /api/google/connect.
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWith("error", "Invalid OAuth state — please try connecting again");
  }

  try {
    await exchangeCodeAndStore(session.user.id, code);
    const res = redirectWith("connected");
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return redirectWith("error", "Failed to connect Google Calendar");
  }
}
