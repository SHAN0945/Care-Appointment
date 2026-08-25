"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-triggered reveal wrapper (no animation library — just an
 * IntersectionObserver flipping a class). Mirrors the "scroll reveal"
 * pattern from react-bits-style component kits: children stay invisible
 * until they cross into the viewport, then fade/slide in once and stay.
 *
 * `delay` (ms) lets a list of siblings stagger by passing an increasing
 * value per item, e.g. `delay={i * 80}`.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "animate-fade-in-up" : "opacity-0"}`}
      style={visible ? { ...style, animationDelay: `${delay}ms` } : style}
    >
      {children}
    </div>
  );
}
