"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` once it scrolls into view. `value` is a display
 * string (e.g. "128", "24/7", "12+") — only a leading integer is animated;
 * everything after it (a suffix like "/7" or "+") is preserved as-is, and
 * values with no leading digits (rare) just render statically.
 */
export function AnimatedCounter({
  value,
  duration = 1200,
  className = "",
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : null;
  const suffix = match ? match[2] : "";

  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [display, setDisplay] = useState(target !== null ? `0${suffix}` : value);

  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const startTime = performance.now();

        function tick(now: number) {
          const progress = Math.min(1, (now - startTime) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(`${Math.round(eased * (target as number))}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
