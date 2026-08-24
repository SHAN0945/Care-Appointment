import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ROLE_PREFIX: Record<string, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  PATIENT: "/patient",
};

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const protectedPrefixes = ["/admin", "/doctor", "/patient"];
  const matchedPrefix = protectedPrefixes.find((p) => path.startsWith(p));

  if (!matchedPrefix) return NextResponse.next();

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  const expectedPrefix = role ? ROLE_PREFIX[role] : undefined;
  if (expectedPrefix !== matchedPrefix) {
    // Logged in, but wrong role for this area — send them to their own portal.
    return NextResponse.redirect(new URL(expectedPrefix ?? "/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/patient/:path*"],
};
