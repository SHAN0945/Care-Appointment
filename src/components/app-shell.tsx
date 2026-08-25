import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav, NavItem } from "@/components/sidebar-nav";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  DOCTOR: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  PATIENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const NAV_ITEMS: Record<"ADMIN" | "DOCTOR" | "PATIENT", NavItem[]> = {
  PATIENT: [
    { href: "/patient", label: "Dashboard", icon: "🏠" },
    { href: "/patient/book", label: "Find Doctor", icon: "🔍" },
    { href: "/patient/appointments", label: "Appointments", icon: "📅" },
    { href: "/patient/symptom-checker", label: "Symptom Checker", icon: "🩺" },
    { href: "/patient/profile", label: "Profile", icon: "👤" },
    { href: "/patient/settings", label: "Settings", icon: "⚙️" },
  ],
  DOCTOR: [
    { href: "/doctor", label: "Dashboard", icon: "🏠" },
    { href: "/doctor/settings", label: "Settings", icon: "⚙️" },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: "🏠" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ],
};

export function AppShell({
  role,
  email,
  title,
  subtitle,
  children,
}: {
  role: "ADMIN" | "DOCTOR" | "PATIENT";
  email?: string | null;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-shrink-0 border-r border-white/60 bg-white/50 backdrop-blur-xl sm:flex sm:flex-col dark:border-white/10 dark:bg-gray-900/40">
        <div className="flex items-center gap-2.5 border-b border-white/60 px-5 py-5 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</span>
        </div>
        <div className="flex-1 px-3 py-4">
          <SidebarNav items={NAV_ITEMS[role]} />
        </div>
        <div className="border-t border-white/60 px-4 py-3 dark:border-white/10">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}>{role}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/60 bg-white/50 px-6 py-4 backdrop-blur-xl sm:hidden dark:border-white/10 dark:bg-gray-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              C
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}>{role}</span>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        <header className="hidden items-center justify-end gap-2 border-b border-white/60 bg-white/50 px-6 py-4 backdrop-blur-xl sm:flex dark:border-white/10 dark:bg-gray-900/40">
          <ThemeToggle />
          <NotificationBell />
          {email && <span className="text-sm text-gray-500 dark:text-gray-400">{email}</span>}
          <SignOutButton />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          {children}
          <div className="mt-8 flex justify-end sm:hidden">
            <SignOutButton />
          </div>
        </main>
      </div>
    </div>
  );
}
