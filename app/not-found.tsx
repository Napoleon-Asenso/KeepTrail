import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto my-16 text-center space-y-6">
      <div
        className="w-16 h-16 mx-auto rounded-full bg-[var(--surface-container-high-color)] text-[var(--on-surface-variant-color)] flex items-center justify-center font-bold text-2xl font-mono"
        aria-hidden="true"
      >
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--on-surface-color)] tracking-tight">
          Resource Not Found
        </h1>
        <p className="text-sm text-[var(--on-surface-variant-color)] leading-relaxed">
          The requested project record could not be found or you do not have permission to view it.
        </p>
      </div>

      <div className="pt-2">
        <Link href="/projects" passHref>
          <Button variant="primary">Return to Projects</Button>
        </Link>
      </div>
    </div>
  );
}
