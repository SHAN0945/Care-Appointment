"use client";

import { useCallback, useEffect, useState } from "react";

const THEME_EVENT = "careflow-theme-change";

/**
 * Shared dark-mode state for every component that shows or toggles it
 * (ThemeToggle in the header, AppearanceSettings on the settings pages).
 * A plain per-component `useState` would go stale the moment a *different*
 * instance flips the theme — the DOM class changes, but nothing tells the
 * other component to re-render — so this dispatches a custom window event
 * on every change and every instance listens for it.
 */
export function useTheme() {
  const [isDark, setIsDarkState] = useState(false);

  useEffect(() => {
    setIsDarkState(document.documentElement.classList.contains("dark"));
    const onChange = () => setIsDarkState(document.documentElement.classList.contains("dark"));
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const setIsDark = useCallback((dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { isDark, setIsDark };
}
