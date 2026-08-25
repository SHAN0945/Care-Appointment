"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateTime, formatDayMonth } from "@/lib/date-utils";

type Notification = {
  id: string;
  event: string;
  status: string;
  createdAt: string;
  slotStart: string | null;
  doctorName: string | null;
  patientName: string | null;
  payload: Record<string, unknown> | null;
};

const EVENT_LABEL: Record<string, string> = {
  BOOKING_CONFIRMATION: "Appointment confirmed",
  APPOINTMENT_REMINDER: "Appointment reminder",
  CANCELLATION: "Appointment cancelled",
  LEAVE_CONFLICT: "Appointment rescheduled",
  MEDICATION_REMINDER: "Medication reminder",
};

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PENDING: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  FAILED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  RETRYING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ABANDONED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function describe(n: Notification): string {
  if (n.event === "MEDICATION_REMINDER") {
    const med = (n.payload?.medicationName as string) ?? "your medication";
    return `Reminder to take ${med}`;
  }
  const who = n.doctorName ?? n.patientName;
  const when = n.slotStart
    ? formatDayMonth(n.slotStart)
    : null;
  if (who && when) return `${who} · ${when}`;
  if (who) return who;
  return "";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const count = notifications?.length ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        🔔
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-medium text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-white/60 bg-white/60 backdrop-blur-xl shadow-lg dark:border-white/10 dark:bg-gray-800/50">
          <div className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
            Recent activity
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications === null ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Nothing yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="border-b border-gray-50 px-4 py-3 last:border-0 dark:border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{EVENT_LABEL[n.event] ?? n.event}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[n.status] ?? ""}`}>
                      {n.status}
                    </span>
                  </div>
                  {describe(n) && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{describe(n)}</p>}
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{formatDateTime(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
