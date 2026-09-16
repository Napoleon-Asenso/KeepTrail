import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignInForm } from "@/components/sign-in-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — KeepTrail",
  description:
    "Sign in to your secure personal projects workspace. Each email address gets its own fully isolated tenant partition.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HomePage() {
  const user = await getCurrentUser();

  // Already authenticated — go straight to projects
  if (user) {
    redirect("/projects");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & headline */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary-color)] text-[var(--on-primary-color)] flex items-center justify-center font-bold text-2xl font-display shadow-lg">
            KT
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[var(--on-surface-color)] tracking-tight">
              Welcome to KeepTrail
            </h1>
            <p className="text-sm text-[var(--on-surface-variant-color)] mt-1.5 leading-relaxed">
              Your personal projects workspace. Private, secure, and yours alone.
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="bg-[var(--surface-container-low-color)] rounded-xl border border-[var(--outline-variant-color)] p-6 shadow-sm">
          <SignInForm />
        </div>

        {/* Trust indicators */}
        <ul className="grid grid-cols-3 gap-3 text-center text-xs text-[var(--on-surface-variant-color)]">
          <li className="space-y-1.5">
            <div className="mx-auto w-8 h-8 rounded-full bg-[var(--primary-container-color)] text-[var(--on-primary-container-color)] flex items-center justify-center" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span>Tenant<br />Isolated</span>
          </li>
          <li className="space-y-1.5">
            <div className="mx-auto w-8 h-8 rounded-full bg-[var(--primary-container-color)] text-[var(--on-primary-container-color)] flex items-center justify-center" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span>Audit<br />Trailed</span>
          </li>
          <li className="space-y-1.5">
            <div className="mx-auto w-8 h-8 rounded-full bg-[var(--primary-container-color)] text-[var(--on-primary-container-color)] flex items-center justify-center" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span>Instantly<br />Addressable</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
