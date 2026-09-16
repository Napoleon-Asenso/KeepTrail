"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function SessionIndicator({
  currentUserEmail,
}: {
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputEmail, setInputEmail] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setError("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setInputEmail("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSwitchUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = inputEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 3) {
      setError("Please enter a valid email address.");
      return;
    }

    document.cookie = `session_email=${encodeURIComponent(trimmed)}; path=/; max-age=86400; SameSite=Lax`;
    setIsOpen(false);
    router.refresh();
  };

  if (!mounted || !currentUserEmail) return null;

  // Derive avatar initial from email local part
  const initial = currentUserEmail.charAt(0).toUpperCase();

  return (
    <div className="relative flex items-center" ref={panelRef}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Signed in as ${currentUserEmail}. Click to switch user.`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-color)]"
      >
        <span
          className="w-8 h-8 rounded-full bg-[var(--primary-color)] text-[var(--on-primary-color)] flex items-center justify-center font-bold text-sm flex-shrink-0 hover:scale-105 transition-transform"
          aria-hidden="true"
        >
          {initial}
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Switch user session"
          className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface-color)] border border-[var(--outline-variant-color)] rounded-xl shadow-xl z-50 p-4 space-y-3"
        >
          <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-container-low-color)] border border-[var(--outline-variant-color)] px-3 py-2">
            <span
              className="w-9 h-9 rounded-full bg-[var(--primary-color)] text-[var(--on-primary-color)] flex items-center justify-center font-bold text-sm flex-shrink-0"
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--on-surface-color)]">
                Signed in as
              </p>
              <p className="text-xs text-[var(--on-surface-variant-color)] break-all">
                {currentUserEmail}
              </p>
            </div>
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[var(--on-surface-color)]">
              Switch User
            </p>
            <p className="text-xs text-[var(--on-surface-variant-color)] leading-relaxed">
              Enter any email to simulate a different user account. Each email is a fully isolated tenant.
            </p>
          </div>

          <form onSubmit={handleSwitchUser} className="space-y-2">
            <div>
              <label htmlFor="switch-user-email" className="sr-only">
                Email address
              </label>
              <input
                ref={inputRef}
                id="switch-user-email"
                type="email"
                value={inputEmail}
                onChange={(e) => {
                  setInputEmail(e.target.value);
                  setError("");
                }}
                placeholder="user@example.com"
                autoComplete="email"
                className={`w-full px-3 py-2 text-sm rounded border ${
                  error
                    ? "border-[var(--error-color)]"
                    : "border-[var(--outline-variant-color)]"
                } bg-[var(--surface-container-lowest-color)] text-[var(--on-surface-color)] placeholder:text-[var(--outline-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-20 focus:border-[var(--primary-color)] transition-colors`}
              />
              {error && (
                <p className="mt-1 text-xs text-[var(--error-color)]" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 text-sm font-medium rounded bg-[var(--primary-color)] text-[var(--on-primary-color)] hover:brightness-110 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
            >
              Sign in as this user
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
