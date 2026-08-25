"use client";

import { useRef } from "react";

/**
 * A card wrapper that follows the cursor with a soft radial glow (the
 * "spotlight card" pattern). Position is written straight to the DOM node
 * via CSS custom properties on mousemove instead of React state, so hovering
 * never triggers a re-render — the glow itself is pure CSS (see
 * `.spotlight-glow` in globals.css).
 *
 * Usage: wrap the same className you'd put on a plain card `<div>`.
 */
export function SpotlightCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} onMouseMove={onMouseMove} className={`spotlight-glow relative ${className}`}>
      {children}
    </div>
  );
}
