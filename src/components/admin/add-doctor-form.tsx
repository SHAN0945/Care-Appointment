"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkingHours } from "@/lib/working-hours";
import { WorkingHoursInput } from "./working-hours-input";

const DEFAULT_HOURS: Partial<WorkingHours> = {
  mon: { start: "09:00", end: "17:00" },
  tue: { start: "09:00", end: "17:00" },
  wed: { start: "09:00", end: "17:00" },
  thu: { start: "09:00", end: "17:00" },
  fri: { start: "09:00", end: "17:00" },
};

export function AddDoctorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workingHours }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create doctor");
      return;
    }

    setForm({ name: "", email: "", password: "", specialization: "", bio: "", slotDurationMinutes: 30 });
    setWorkingHours(DEFAULT_HOURS);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        + Add doctor
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <h3 className="font-medium text-gray-900 dark:text-gray-100">New doctor</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="doctor-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full name</label>
          <input
            id="doctor-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="doctor-specialization" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Specialization</label>
          <input
            id="doctor-specialization"
            required
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="doctor-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            id="doctor-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="doctor-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Temp password</label>
          <input
            id="doctor-password"
            type="text"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="doctor-slot-duration" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Slot duration (min)</label>
          <input
            id="doctor-slot-duration"
            type="number"
            min={5}
            max={240}
            required
            value={form.slotDurationMinutes}
            onChange={(e) =>
              setForm({ ...form, slotDurationMinutes: Number(e.target.value) })
            }
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label htmlFor="doctor-bio" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio (optional)</label>
        <textarea
          id="doctor-bio"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          rows={2}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Working hours</label>
        <WorkingHoursInput value={workingHours} onChange={setWorkingHours} />
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create doctor"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
