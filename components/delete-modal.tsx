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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            className="w-full max-w-md rounded-xl bg-[var(--surface-color)] border border-[var(--outline-variant-color)] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full bg-[var(--error-container-color)] text-[var(--on-error-container-color)] flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5 text-[var(--error-color)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <div className="space-y-1">
                <h3
                  id="delete-dialog-title"
                  className="text-lg font-semibold text-[var(--on-surface-color)] font-display"
                >
                  Delete Project
                </h3>
                <p
                  id="delete-dialog-description"
                  className="text-sm text-[var(--on-surface-variant-color)] leading-relaxed"
                >
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-[var(--on-surface-color)]">
                    &ldquo;{projectTitle}&rdquo;
                  </span>
                  ? This operation is permanent and will generate an immutable audit log.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="p-3 rounded bg-[var(--error-container-color)] text-[var(--on-error-container-color)] text-xs border border-[var(--error-color)]/20"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
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
