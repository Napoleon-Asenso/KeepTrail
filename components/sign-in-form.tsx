"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 3) {
      setError("Please enter a valid email address.");
      return;
    }

    document.cookie = `session_email=${encodeURIComponent(trimmed)}; path=/; max-age=86400; SameSite=Lax`;
    router.push("/projects");
  };

  return (
    <div className="max-w-sm w-full mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="signin-email"
            className="block text-sm font-medium text-[var(--on-surface-color)]"
          >
            Email address
          </label>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "signin-email-error" : undefined}
            className={`w-full px-3.5 py-2.5 text-sm rounded border ${
              error
                ? "border-[var(--error-color)]"
                : "border-[var(--outline-variant-color)]"
            } bg-[var(--surface-container-lowest-color)] text-[var(--on-surface-color)] placeholder:text-[var(--outline-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-20 focus:border-[var(--primary-color)] transition-colors`}
          />
          {error && (
            <p
              id="signin-email-error"
              className="text-xs text-[var(--error-color)] font-medium"
              role="alert"
            >
              {error}
            </p>
          )}
          <p className="text-xs text-[var(--on-surface-variant-color)]">
            New users are automatically provisioned with an isolated private workspace.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 text-sm font-semibold rounded bg-[var(--primary-color)] text-[var(--on-primary-color)] hover:brightness-110 active:brightness-95 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-1"
        >
          Continue to Projects
        </button>
      </form>
    </div>
  );
}
