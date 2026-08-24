"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_LINKS = [
  { href: "#specialties", label: "Specialties" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#doctors", label: "Our Doctors" },
];

export function LandingHeader({ dashboardHref }: { dashboardHref?: string | null }) {
  const [open, setOpen] = useState(false);
  const loggedIn = !!dashboardHref;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loggedIn ? (
            <>
              <ThemeToggle />
              <SignOutButton />
              <a
                href={dashboardHref!}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Go to Dashboard
              </a>
            </>
          ) : (
            <>
              <a href="/login/doctor" className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                For Doctors
              </a>
              <a href="/login/admin" className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                Admin
              </a>
              <ThemeToggle />
              <a
                href="/login/patient"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Sign in
              </a>
              <a
                href="/register"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Get Started
              </a>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {l.label}
              </a>
            ))}
            <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
            {loggedIn ? (
              <>
                <a href={dashboardHref!} className="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
                  Go to Dashboard
                </a>
                <div className="mt-2">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <>
                <a href="/login/patient" className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient Sign in</a>
                <a href="/login/doctor" className="text-sm font-medium text-gray-700 dark:text-gray-300">Doctor Sign in</a>
                <a href="/login/admin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Sign in</a>
                <a href="/register" className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
                  Get Started
                </a>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
