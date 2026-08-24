import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { SymptomCheckerForm } from "@/components/patient/symptom-checker-form";

export default async function SymptomCheckerPage() {
  const session = await auth();

  return (
    <AppShell role="PATIENT" email={session?.user?.email} title="Symptom Checker">
      <SymptomCheckerForm />
    </AppShell>
  );
}
