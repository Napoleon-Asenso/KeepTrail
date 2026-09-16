import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { SessionIndicator } from "@/components/session-indicator";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KeepTrail — Personal Projects Management",
    template: "%s | KeepTrail",
  },
  description:
    "KeepTrail is a secure personal projects management tool with tenant isolation, NanoID routing, and transactional audit trails.",
  applicationName: "KeepTrail",
  keywords: [
    "personal projects",
    "project management",
    "task tracking",
    "audit trail",
    "tenant isolation",
  ],
  authors: [{ name: "KeepTrail" }],
  creator: "KeepTrail",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "KeepTrail",
    title: "KeepTrail — Personal Projects Management",
    description:
      "KeepTrail is a secure personal projects management tool with tenant isolation, NanoID routing, and transactional audit trails.",
  },
  twitter: {
    card: "summary",
    title: "KeepTrail — Personal Projects Management",
    description:
      "KeepTrail is a secure personal projects management tool with tenant isolation, NanoID routing, and transactional audit trails.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0369a0",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="bg-[var(--background-color)] text-[var(--on-background-color)] min-h-screen flex flex-col font-sans antialiased">
        <header className="border-b border-[var(--outline-variant-color)] bg-[var(--surface-color)]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/projects"
                className="flex items-center gap-2.5 group text-[var(--on-surface-color)] focus-visible:outline-none"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-color)] text-[var(--on-primary-color)] flex items-center justify-center font-bold font-display shadow-xs group-hover:scale-105 transition-transform">
                  KT
                </div>
                <span className="font-display font-bold text-lg tracking-tight">
                  KeepTrail
                </span>
              </Link>
              <nav aria-label="Main Navigation">
                <Link
                  href="/projects"
                  className="text-sm font-medium text-[var(--on-surface-variant-color)] hover:text-[var(--primary-color)] transition-colors px-2 py-1 rounded"
                >
                  Projects
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <SessionIndicator currentUserEmail={user?.email ?? null} />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
