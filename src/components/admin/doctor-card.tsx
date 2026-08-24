"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkingHours, formatWorkingHours } from "@/lib/working-hours";
import { formatDate } from "@/lib/date-utils";

type Leave = { id: string; date: string; reason: string | null };

export type DoctorWithLeaves = {
  id: string;
  specialization: string;
  slotDurationMinutes: number;
  workingHours: WorkingHours;
  user: { name: string; email: string };
  leaves: Leave[];
};

export function DoctorCard({ doctor }: { doctor: DoctorWithLeaves }) {
  const router = useRouter();
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function addLeave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const res = await fetch(`/api/admin/doctors/${doctor.id}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: leaveDate, reason: leaveReason || undefined }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to mark leave");
      return;
    }
    const data = await res.json();
    if (data.cancelledCount > 0) {
      setNotice(
        `${data.cancelledCount} existing appointment(s) on this date were cancelled and affected patients queued for notification.`
      );
    }
    setLeaveDate("");
    setLeaveReason("");
    router.refresh();
  }

  async function removeLeave(leaveId: string) {
    await fetch(`/api/admin/doctors/${doctor.id}/leave/${leaveId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{doctor.user.name}</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {doctor.specialization}
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.user.email}</p>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        <span className="font-medium text-gray-900 dark:text-gray-100">Hours:</span> {formatWorkingHours(doctor.workingHours)}
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        <span className="font-medium text-gray-900 dark:text-gray-100">Slot length:</span> {doctor.slotDurationMinutes} min
      </p>

      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">Leave days</p>
        {doctor.leaves.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">None scheduled</p>
        )}
        <ul className="space-y-1">
          {doctor.leaves.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span>{formatDate(l.date)}</span>
              {l.reason && <span className="text-gray-500 dark:text-gray-400">— {l.reason}</span>}
              <button
                onClick={() => removeLeave(l.id)}
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                remove
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={addLeave} className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`leave-date-${doctor.id}`} className="block text-xs text-gray-500 dark:text-gray-400">Date</label>
            <input
              id={`leave-date-${doctor.id}`}
              type="date"
              required
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label htmlFor={`leave-reason-${doctor.id}`} className="block text-xs text-gray-500 dark:text-gray-400">Reason (optional)</label>
            <input
              id={`leave-reason-${doctor.id}`}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {loading ? "Marking…" : "Mark leave"}
          </button>
        </form>
        {notice && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{notice}</p>
        )}
        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      </div>
    </div>
  );
}
