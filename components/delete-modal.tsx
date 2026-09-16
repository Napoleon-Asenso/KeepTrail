"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { deleteRecordWithAudit } from "@/actions/delete-record";
import { Button } from "@/components/ui/button";

interface DeleteModalProps {
  slug: string;
  projectTitle: string;
}

export function DeleteModal({ slug, projectTitle }: DeleteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPending) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      cancelButtonRef.current?.focus();
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending]);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteRecordWithAudit(slug);
        // Note: deleteRecordWithAudit initiates redirect('/projects')
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete project. Please try again.";
        setError(message);
      }
    });
  };

  return (
    <>
      <Button
        variant="danger"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        data-testid="delete-project-trigger"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Project
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--outline-variant-color)] bg-[var(--surface-container-lowest-color)] shadow-2xl animate-in zoom-in-95 duration-200"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--on-surface-variant-color)] hover:bg-[var(--surface-container-color)] hover:text-[var(--on-surface-color)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6 sm:p-8 text-center">
              {/* Warning icon */}
              <div className="mx-auto w-14 h-14 flex items-center justify-center" aria-hidden="true">
                <svg className="w-12 h-12 text-[var(--error-color)]" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.75 3.063a2.25 2.25 0 014.5 0l8.25 14.25a2.25 2.25 0 01-1.942 3.437H3.442a2.25 2.25 0 01-1.942-3.437L9.75 3.062zM12 8.25a.75.75 0 00-.75.75v3.75a.75.75 0 001.5 0V9a.75.75 0 00-.75-.75zm0 8.25a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z"
                  />
                </svg>
              </div>

              <h3
                id="delete-dialog-title"
                className="mt-5 text-xl font-semibold font-display text-[var(--on-surface-color)] tracking-tight"
              >
                Delete this project?
              </h3>

              <p
                id="delete-dialog-description"
                className="mt-2 text-sm text-[var(--on-surface-variant-color)] leading-relaxed"
              >
                You are about to permanently delete{" "}
                <span className="font-semibold text-[var(--on-surface-color)]">
                  &ldquo;{projectTitle}&rdquo;
                </span>
                . This action cannot be undone.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-[var(--on-surface-variant-color)] bg-[var(--surface-container-color)] rounded-full px-3 py-1.5">
                <svg
                  className="w-3.5 h-3.5 text-[var(--error-color)] flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                An immutable audit log entry will be recorded
              </div>
            </div>

            {error && (
              <div
                className="mx-6 sm:mx-8 mb-4 p-3 rounded-xl bg-[var(--error-container-color)] text-[var(--on-error-container-color)] text-xs border border-[var(--error-color)]/20"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 bg-[var(--surface-container-low-color)] border-t border-[var(--outline-variant-color)]">
              <Button
                ref={cancelButtonRef}
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={isPending}
                disabled={isPending}
                onClick={handleDelete}
                data-testid="confirm-delete-button"
              >
                {isPending ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
