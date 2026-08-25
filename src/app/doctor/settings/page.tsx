import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { GoogleCalendarStatus } from "@/components/google-calendar-status";
import { AppearanceSettings } from "@/components/appearance-settings";

export default async function DoctorSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; message?: string }>;
}) {
  const session = await auth();
  const banner = await searchParams;

  return (
    <AppShell role="DOCTOR" email={session?.user?.email} title="Settings">
      <div className="space-y-4">
        <AppearanceSettings />
        <div className="rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/50">
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
