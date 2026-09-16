"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionIndicator({
  currentUserEmail,
}: {
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const switchSession = (type: "user-a" | "user-b" | "unauthenticated") => {
    if (type === "unauthenticated") {
      document.cookie = "session_unauthenticated=true; path=/; max-age=86400";
      document.cookie = "session_email=; path=/; max-age=0";
    } else if (type === "user-b") {
      document.cookie = "session_unauthenticated=; path=/; max-age=0";
      document.cookie = "session_email=user-b@keeptrail.local; path=/; max-age=86400";
    } else {
      document.cookie = "session_unauthenticated=; path=/; max-age=0";
      document.cookie = "session_email=user-a@keeptrail.local; path=/; max-age=86400";
    }
    router.refresh();
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[var(--on-surface-variant-color)] hidden sm:inline">
        Session:
      </span>
      <div className="inline-flex rounded border border-[var(--outline-variant-color)] p-0.5 bg-[var(--surface-container-low-color)]">
        <button
          type="button"
          onClick={() => switchSession("user-a")}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            currentUserEmail === "user-a@keeptrail.local"
              ? "bg-[var(--primary-color)] text-[var(--on-primary-color)]"
              : "text-[var(--on-surface-variant-color)] hover:text-[var(--on-surface-color)]"
          }`}
          title="Switch to User A"
        >
          User A
        </button>
        <button
          type="button"
          onClick={() => switchSession("user-b")}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            currentUserEmail === "user-b@keeptrail.local"
              ? "bg-[var(--primary-color)] text-[var(--on-primary-color)]"
              : "text-[var(--on-surface-variant-color)] hover:text-[var(--on-surface-color)]"
          }`}
          title="Switch to User B"
        >
          User B
        </button>
        <button
          type="button"
          onClick={() => switchSession("unauthenticated")}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            !currentUserEmail
              ? "bg-[var(--error-color)] text-[var(--on-error-color)]"
              : "text-[var(--on-surface-variant-color)] hover:text-[var(--on-surface-color)]"
          }`}
          title="Simulate Unauthenticated Session (AC-101)"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
