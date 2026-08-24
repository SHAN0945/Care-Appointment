"use client";

import { useTheme } from "@/lib/use-theme";

export function AppearanceSettings() {
  const { isDark, setIsDark } = useTheme();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Choose how CareFlow looks on this device.</p>
      <div className="grid max-w-xs grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIsDark(false)}
          className={`rounded-lg border p-4 text-center transition-colors ${
            !isDark
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          }`}
        >
          <span className="mb-1 block text-xl">☀️</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Light</span>
        </button>
        <button
          type="button"
          onClick={() => setIsDark(true)}
          className={`rounded-lg border p-4 text-center transition-colors ${
            isDark
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          }`}
        >
          <span className="mb-1 block text-xl">🌙</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark</span>
        </button>
      </div>
    </div>
  );
}
