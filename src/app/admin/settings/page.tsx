import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AppearanceSettings } from "@/components/appearance-settings";

export default async function AdminSettingsPage() {
  const session = await auth();

  return (
    <AppShell role="ADMIN" email={session?.user?.email} title="Settings">
      <AppearanceSettings />
    </AppShell>
  );
}
