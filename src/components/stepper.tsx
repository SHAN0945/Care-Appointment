export type Step = { label: string; icon: string };

export function Stepper({ steps, currentIndex }: { steps: Step[]; currentIndex: number }) {
  return (
    <ol className="mb-8 flex items-center">
      {steps.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "upcoming";
        return (
          <li key={step.label} className="flex flex-1 items-center last:flex-initial">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  state === "done"
                    ? "bg-blue-600 text-white"
                    : state === "active"
                      ? "border-2 border-blue-600 bg-white text-blue-600 dark:bg-gray-900"
                      : "border-2 border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                }`}
              >
                {state === "done" ? "✓" : step.icon}
              </span>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  state === "upcoming" ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 rounded ${i < currentIndex ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
