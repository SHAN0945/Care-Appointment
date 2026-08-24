import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareFlow — Healthcare Appointment & Follow-up Manager",
  description: "Healthcare appointment & follow-up manager",
};

// Applies a previously-chosen dark preference before hydration so there's no
// flash of the wrong theme. Defaults to light (not the OS preference) for
// first-time visitors — see globals.css for why that's a deliberate choice.
const THEME_INIT_SCRIPT = `
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme-init script below adds "dark" to this element before React
      // hydrates (so there's no flash of the wrong theme) — that intentionally
      // makes the client's actual className differ from what was
      // server-rendered. Suppressing the warning here is the standard fix for
      // this exact pattern; nothing else on the page opts out of the check.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
