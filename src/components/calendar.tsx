"use client";

import { useState } from "react";
import { DayKey, WorkingHours } from "@/lib/working-hours";
import { formatMonthYear } from "@/lib/date-utils";

const WEEKDAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toISODate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Self-built month-grid date picker (no external dependency). Disables past
 * days and, when `workingHours` is given, any weekday the doctor doesn't
 * work at all — so a patient never lands on a day that was always going to
 * show zero slots without knowing why.
 */
export function Calendar({
  selected,
  onSelect,
  workingHours,
}: {
  selected: string;
  onSelect: (date: string) => void;
  workingHours?: WorkingHours;
}) {
  const selectedDate = new Date(selected + "T00:00:00");
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  }

  return (
    <div className="w-full max-w-xs rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatMonthYear(viewYear, viewMonth)}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs text-gray-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const iso = toISODate(viewYear, viewMonth, d);
          const weekday = new Date(viewYear, viewMonth, d).getDay();
          const isPast = iso < todayStr;
          const isNonWorkingDay = workingHours ? !workingHours[WEEKDAY_KEYS[weekday]] : false;
          const disabled = isPast || isNonWorkingDay;
          const isSelected = iso === selected;
          const isToday = iso === todayStr;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              title={isNonWorkingDay && !isPast ? "Doctor doesn't work this day" : undefined}
              onClick={() => onSelect(iso)}
              className={`aspect-square rounded-md text-sm transition-colors ${
                isSelected
                  ? "bg-blue-600 font-medium text-white"
                  : disabled
                    ? "cursor-not-allowed text-gray-300 dark:text-gray-700"
                    : isToday
                      ? "border border-blue-400 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
