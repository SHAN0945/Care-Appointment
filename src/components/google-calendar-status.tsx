import { prisma } from "@/lib/prisma";
import { isGoogleConfigured } from "@/lib/google-calendar";

export async function GoogleCalendarStatus({
  userId,
  banner,
}: {
  userId: string;
  banner?: { status?: string; message?: string };
}) {
  if (!isGoogleConfigured()) return null;

  const token = await prisma.googleCalendarToken.findUnique({ where: { userId } });

  return (
    <div className="mb-6 space-y-2">
      {banner?.status === "connected" && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Google Calendar connected.
        </p>
      )}
      {banner?.status === "error" && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Couldn&apos;t connect Google Calendar{banner.message ? `: ${banner.message}` : ""}.
        </p>
      )}
      {!token && (
        <a
          href="/api/google/connect"
          className="inline-block rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-600 dark:border-blue-400 dark:text-blue-400"
        >
          Connect Google Calendar
        </a>
      )}
      {token && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Google Calendar connected — appointments sync automatically.
        </p>
      )}
    </div>
  );
}
