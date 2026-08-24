import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { GoogleCalendarStatus } from "@/components/google-calendar-status";
import { AppearanceSettings } from "@/components/appearance-settings";

export default async function PatientSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; message?: string }>;
}) {
  const session = await auth();
  const banner = await searchParams;

  return (
    <AppShell role="PATIENT" email={session?.user?.email} title="Settings">
      <div className="space-y-4">
        <AppearanceSettings />
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Calendar sync</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Connect Google Calendar so confirmed appointments appear on your calendar automatically.
          </p>
          {session?.user?.id && (
            <GoogleCalendarStatus userId={session.user.id} banner={{ status: banner.google, message: banner.message }} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
