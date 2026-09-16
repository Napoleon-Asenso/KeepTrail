import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CreateForm } from "@/components/create-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation & header */}
      <div>
        <nav aria-label="Breadcrumb" className="mb-3">
          <Link
            href="/projects"
            className="inline-flex items-center text-xs font-medium text-[var(--on-surface-variant-color)] hover:text-[var(--primary-color)] transition-colors gap-1"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </Link>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[var(--on-surface-color)]">
          Create New Project
        </h1>
        <p className="text-sm text-[var(--on-surface-variant-color)] mt-1">
          Add a new personal project. All entries are protected with strict tenant isolation.
        </p>
      </div>

      {/* Screen 2: Form Component */}
      <CreateForm />
    </div>
  );
}
