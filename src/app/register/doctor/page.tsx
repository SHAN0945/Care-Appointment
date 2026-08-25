"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkingHoursInput } from "@/components/admin/working-hours-input";
import { WorkingHours } from "@/lib/working-hours";

const DEFAULT_HOURS: Partial<WorkingHours> = {
  mon: { start: "09:00", end: "17:00" },
  tue: { start: "09:00", end: "17:00" },
  wed: { start: "09:00", end: "17:00" },
  thu: { start: "09:00", end: "17:00" },
  fri: { start: "09:00", end: "17:00" },
};

export default function DoctorRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    bio: "",
    slotDurationMinutes: 30,
  });
  const [workingHours, setWorkingHours] = useState<Partial<WorkingHours>>(DEFAULT_HOURS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workingHours }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (signInRes?.error) {
      router.push("/login/doctor");
      return;
    }
    router.push("/doctor");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <a href="/" className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            C
          </a>
          <a href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</a>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">
            <span>👩‍⚕️</span> Doctor Portal
          </span>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-xl p-6 shadow-sm dark:border-white/10 dark:bg-gray-900/50">
          <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">Register as a doctor</h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Your profile is live immediately — patients can book with you as soon as you finish this form.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="doctor-reg-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full name</label>
                <input
                  id="doctor-reg-name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="doctor-reg-specialization" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Specialization</label>
                <input
                  id="doctor-reg-specialization"
                  required
                  placeholder="e.g. Cardiology"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="doctor-reg-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  id="doctor-reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="doctor-reg-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                  id="doctor-reg-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="doctor-reg-slot" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Slot duration (min)</label>
                <input
                  id="doctor-reg-slot"
                  type="number"
                  min={5}
                  max={240}
                  required
                  value={form.slotDurationMinutes}
                  onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="doctor-reg-bio" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio (optional)</label>
              <textarea
                id="doctor-reg-bio"
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Working hours</label>
              <WorkingHoursInput value={workingHours} onChange={setWorkingHours} />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create doctor account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <a href="/login/doctor" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
