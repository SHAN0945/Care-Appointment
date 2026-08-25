/** An animated gradient-shimmer accent for headline text. Pure CSS (see
 *  `.text-gradient-animated` in globals.css), so this stays a server
 *  component — no interactivity needed. */
export function ShinyText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-gradient-animated ${className}`}>{children}</span>;
}
