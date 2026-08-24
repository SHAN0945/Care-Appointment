import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { formatDate } from "@/lib/date-utils";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default async function PatientProfilePage() {
  const session = await auth();
  const profile = session?.user?.id
    ? await prisma.patientProfile.findUnique({
        where: { userId: session.user.id },
        include: { user: { select: { name: true, email: true, createdAt: true } } },
      })
    : null;

  const name = profile?.user.name ?? session?.user?.name ?? "—";
  const rows = [
    { label: "Full name", value: name },
    { label: "Email", value: profile?.user.email ?? session?.user?.email ?? "—" },
    { label: "Phone", value: profile?.phone ?? "Not provided" },
    {
      label: "Patient since",
      value: profile?.user.createdAt
        ? formatDate(profile.user.createdAt)
        : "—",
    },
  ];

  return (
    <AppShell role="PATIENT" email={session?.user?.email} title="Profile">
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {initials(name)}
        </span>
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Patient account</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{r.label}</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </AppShell>
  );
}
