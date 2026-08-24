"use client";

import { DAY_KEYS, DAY_LABELS, DayKey, WorkingHours } from "@/lib/working-hours";

export function WorkingHoursInput({
  value,
  onChange,
}: {
  value: Partial<WorkingHours>;
  onChange: (next: Partial<WorkingHours>) => void;
}) {
  function toggleDay(day: DayKey, enabled: boolean) {
    const next = { ...value };
    if (enabled) {
      next[day] = { start: "09:00", end: "17:00" };
    } else {
      delete next[day];
    }
    onChange(next);
  }

  function setTime(day: DayKey, field: "start" | "end", time: string) {
    const current = value[day] ?? { start: "09:00", end: "17:00" };
    onChange({ ...value, [day]: { ...current, [field]: time } });
  }

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
      {DAY_KEYS.map((day) => {
        const enabled = !!value[day];
        return (
          <div key={day} className="flex items-center gap-3 text-sm">
            <label className="flex w-20 items-center gap-2 text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => toggleDay(day, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              />
              {DAY_LABELS[day]}
            </label>
            {enabled && (
              <>
                <input
                  type="time"
                  aria-label={`${DAY_LABELS[day]} start time`}
                  value={value[day]?.start}
                  onChange={(e) => setTime(day, "start", e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="time"
                  aria-label={`${DAY_LABELS[day]} end time`}
                  value={value[day]?.end}
                  onChange={(e) => setTime(day, "end", e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
