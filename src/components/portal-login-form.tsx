"use client";

import { useState, Suspense } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

type Role = "PATIENT" | "DOCTOR" | "ADMIN";

const THEME: Record<
  Role,
  { label: string; home: string; accent: string; ring: string; icon: string; blurb: string }
> = {
  PATIENT: {
    label: "Patient Portal",
    home: "/patient",
    accent: "bg-emerald-600 hover:bg-emerald-700",
    ring: "focus:border-emerald-500 focus:ring-emerald-500",
    icon: "🩺",
    blurb: "Book appointments, share symptoms, and track your care.",
  },
  DOCTOR: {
    label: "Doctor Portal",
    home: "/doctor",
    accent: "bg-blue-600 hover:bg-blue-700",
    ring: "focus:border-blue-500 focus:ring-blue-500",
    icon: "👩‍⚕️",
    blurb: "Review AI pre-visit summaries and manage your patients.",
  },
  ADMIN: {
    label: "Admin Portal",
    home: "/admin",
    accent: "bg-violet-600 hover:bg-violet-700",
    ring: "focus:border-violet-500 focus:ring-violet-500",
    icon: "🗂️",
    blurb: "Manage doctors, working hours, and clinic-wide leave.",
  },
};

function Form({ role }: { role: Role }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;
  const theme = THEME[role];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      setError("Invalid email or password");
      return;
    }

    // The credentials form doesn't know the account's role in advance — check
    // it matches the portal the user actually chose, so a patient landing on
    // the doctor login (or a stale session-expiry redirect) gets a clear
    // message instead of silently ending up in someone else's dashboard.
    const session = await getSession();
    if (session?.user?.role && session.user.role !== role) {
      await signOut({ redirect: false });
      setLoading(false);
      setError(`That account isn't registered as a ${role.toLowerCase()}. Try the correct portal below.`);
      return;
    }

    router.push(callbackUrl ?? theme.home);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16 dark:bg-gray-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <a href="/" className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            C
          </a>
          <a href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</a>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">
            <span>{theme.icon}</span> {theme.label}
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">Sign in</h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{theme.blurb}</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${theme.ring}`}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${theme.ring}`}
              />
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50 ${theme.accent}`}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {role === "PATIENT" && (
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            New here?{" "}
            <a href="/register" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              Create a patient account
            </a>
          </p>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Wrong portal?{" "}
          <a href="/login" className="font-medium text-gray-700 hover:underline dark:text-gray-300">
            Choose a different one
          </a>
        </p>
      </div>
    </div>
  );
}

export function PortalLoginForm({ role }: { role: Role }) {
  return (
    <Suspense>
      <Form role={role} />
    </Suspense>
  );
}
