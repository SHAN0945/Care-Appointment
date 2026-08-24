import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";

/**
 * Defense-in-depth role check for API route handlers. `src/proxy.ts` already
 * blocks unauthenticated/wrong-role access to the *page* routes, but API
 * routes are reachable directly (e.g. `fetch("/api/admin/doctors")`) so each
 * handler re-checks the session itself rather than relying solely on the
 * proxy/middleware layer.
 */
export async function requireRole(role: Role) {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  if (session.user.role !== role) {
    return {
      session: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }
  return { session, response: null } as const;
}
