import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Welcome to KeepTrail, your secure personal projects management workspace with audit trails.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/projects");
  }

  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-xl border border-[var(--outline-variant-color)] bg-[var(--surface-container-low-color)] text-center shadow-sm space-y-6">
      <div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary-container-color)] text-[var(--on-primary-container-color)] flex items-center justify-center font-bold text-lg font-display">
        KT
      </div>
      <div>
        <h1 className="text-2xl font-bold font-display text-[var(--on-surface-color)]">
          Welcome to KeepTrail
        </h1>
        <p className="text-sm text-[var(--on-surface-variant-color)] mt-2">
          Assessment 4: The Records and Access Slice. Please select an active session in the header to continue.
        </p>
      </div>

      <div className="pt-2">
        <Link href="/projects" passHref>
          <Button variant="primary" className="w-full">
            Go to Projects
          </Button>
        </Link>
      </div>
    </div>
  );
}
