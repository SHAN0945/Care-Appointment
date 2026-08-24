export function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                C
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">CareFlow</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Appointment booking and follow-up care, coordinated automatically between you and your doctor.
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Portals</p>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="/login/patient" className="hover:text-gray-800 dark:hover:text-gray-200">Patient sign in</a></li>
              <li><a href="/login/doctor" className="hover:text-gray-800 dark:hover:text-gray-200">Doctor sign in</a></li>
              <li><a href="/login/admin" className="hover:text-gray-800 dark:hover:text-gray-200">Admin sign in</a></li>
              <li><a href="/register" className="hover:text-gray-800 dark:hover:text-gray-200">Create a patient account</a></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Product</p>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#specialties" className="hover:text-gray-800 dark:hover:text-gray-200">Specialties</a></li>
              <li><a href="#how-it-works" className="hover:text-gray-800 dark:hover:text-gray-200">How it works</a></li>
              <li><a href="#features" className="hover:text-gray-800 dark:hover:text-gray-200">Features</a></li>
              <li><a href="#doctors" className="hover:text-gray-800 dark:hover:text-gray-200">Our doctors</a></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Care you can rely on</p>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li>AI-assisted pre-visit triage</li>
              <li>Automatic calendar &amp; email sync</li>
              <li>Medication reminders</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
          © {new Date().getFullYear()} CareFlow. Built for demonstration purposes.
        </div>
      </div>
    </footer>
  );
}
