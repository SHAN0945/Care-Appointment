import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/api/google/callback`;
}

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function newOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

export function getGoogleAuthUrl(state: string): string {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures a refresh_token is issued even on repeat connects
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeAndStore(userId: string, code: string) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error("Google did not return the expected token set (missing refresh_token?)");
  }
  await prisma.googleCalendarToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date),
    },
  });
}

async function getAuthorizedClientForUser(userId: string) {
  const stored = await prisma.googleCalendarToken.findUnique({ where: { userId } });
  if (!stored) return null;

  const client = newOAuthClient();
  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiresAt.getTime(),
  });

  // Persist a refreshed access token back to the DB so the next call reuses it.
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.googleCalendarToken.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          ...(tokens.expiry_date ? { expiresAt: new Date(tokens.expiry_date) } : {}),
        },
      });
    }
  });

  return client;
}

export type CalendarResult = { ok: true; eventId: string } | { ok: false; error: string };

export async function createCalendarEvent(
  userId: string,
  event: { summary: string; description?: string; start: Date; end: Date }
): Promise<CalendarResult> {
  if (!isGoogleConfigured()) return { ok: false, error: "Google Calendar not configured" };

  try {
    const auth = await getAuthorizedClientForUser(userId);
    if (!auth) return { ok: false, error: "Recipient hasn't connected Google Calendar" };

    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
      },
    });
    if (!res.data.id) return { ok: false, error: "Google Calendar did not return an event id" };
    return { ok: true, eventId: res.data.id };
  } catch (err) {
    console.error("createCalendarEvent failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<CalendarResult> {
  if (!isGoogleConfigured()) return { ok: false, error: "Google Calendar not configured" };

  try {
    const auth = await getAuthorizedClientForUser(userId);
    if (!auth) return { ok: false, error: "Recipient hasn't connected Google Calendar" };

    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId });
    return { ok: true, eventId };
  } catch (err) {
    console.error("deleteCalendarEvent failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
