// Tiny native replacements for the two date-fns helpers the app actually
// used — not worth a whole dependency for two one-liners (same local-time
// semantics as date-fns: constructed from the Date's local Y/M/D).

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// Every date shown in the UI goes through one of these, all pinned to an
// explicit locale rather than the runtime's default. Passing `undefined` as
// the locale argument (as most of these call sites used to) still depends
// on whatever locale the current environment defaults to — Node's server
// locale and a browser's locale aren't guaranteed to match, which produces a
// genuine React hydration mismatch for any of this text rendered during SSR
// (confirmed directly: the appointment list showed "24/08/2026, 19:00:00"
// server-side vs "24/8/2026, 7:00:00 pm" client-side for the exact same
// Date). Pinning the locale makes the output identical everywhere, closing
// the mismatch risk rather than just reducing it.
const LOCALE = "en-US";

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatDateTime(value: Date | string): string {
  return toDate(value).toLocaleString(LOCALE, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(value: Date | string): string {
  return toDate(value).toLocaleDateString(LOCALE, { dateStyle: "medium" });
}

export function formatTime(value: Date | string): string {
  return toDate(value).toLocaleTimeString(LOCALE, { timeStyle: "short" });
}

export function formatDayMonth(value: Date | string): string {
  return toDate(value).toLocaleDateString(LOCALE, { day: "2-digit", month: "short" });
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}
