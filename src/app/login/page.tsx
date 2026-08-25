import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const PORTALS = [
  {
    role: "patient",
    label: "Patient",
    icon: "🩺",
    accent: "border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100 dark:border-emerald-900 dark:hover:border-emerald-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    blurb: "Book appointments, share symptoms, view your visit summaries.",
  },
  {
    role: "doctor",
    label: "Doctor",
    icon: "👩‍⚕️",
    accent: "border-blue-200 hover:border-blue-400 hover:shadow-blue-100 dark:border-blue-900 dark:hover:border-blue-600",
    iconBg: "bg-blue-50 dark:bg-blue-900/30",
    blurb: "Review AI pre-visit summaries, complete visits and prescriptions.",
  },
  {
    role: "admin",
    label: "Admin",
    icon: "🗂️",
    accent: "border-violet-200 hover:border-violet-400 hover:shadow-violet-100 dark:border-violet-900 dark:hover:border-violet-600",
    iconBg: "bg-violet-50 dark:bg-violet-900/30",
    blurb: "Manage doctor profiles, working hours, and leave.",
  },
];

function PortalChooser({ callbackUrl }: { callbackUrl?: string }) {
  const qs = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-3xl text-center">
        <a href="/" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
          C
        </a>
        <a href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</a>
        <h1 className="mt-4 mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">Sign in to your portal</h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">Choose the portal that matches your account.</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {PORTALS.map((p) => (
            <a
              key={p.role}
              href={`/login/${p.role}${qs}`}
              className={`rounded-xl border bg-white/60 p-6 text-left shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900/50 dark:shadow-none ${p.accent}`}
            >
              <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg text-xl ${p.iconBg}`}>
                {p.icon}
              </span>
              <p className="font-semibold text-gray-900 dark:text-gray-50">{p.label}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{p.blurb}</p>
            </a>
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          New patient?{" "}
          <a href="/register" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}

async function ChooserWithParams({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  return <PortalChooser callbackUrl={params.callbackUrl} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <Suspense>
      <ChooserWithParams searchParams={searchParams} />
    </Suspense>
  );
}
