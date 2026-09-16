import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-12 sm:p-16 rounded-xl border-2 border-dashed border-[var(--outline-variant-color)] bg-[var(--surface-container-low-color)]"
      data-testid="true-empty-state"
    >
      <div
        className="w-16 h-16 mb-5 rounded-full bg-[var(--primary-container-color)] text-[var(--on-primary-container-color)] flex items-center justify-center shadow-inner"
        aria-hidden="true"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-[var(--on-surface-color)] tracking-tight mb-2 font-display">
        No projects yet
      </h2>

      <p className="text-sm text-[var(--on-surface-variant-color)] max-w-sm mb-6 leading-relaxed">
        Get started by creating your first personal project. All records are isolated securely to your account.
      </p>

      <Link href="/projects/new" passHref>
        <Button variant="primary" size="lg" className="font-semibold shadow-md">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Your First Project
        </Button>
      </Link>
    </div>
  );
}
