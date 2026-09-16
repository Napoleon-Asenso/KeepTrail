"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projectUpdateSchema } from "@/lib/validations/project";
import { updateProjectRecord } from "@/actions/update-project";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface EditFormProps {
  slug: string;
  initialTitle: string;
  initialDescription: string | null;
}

export function EditForm({ slug, initialTitle, initialDescription }: EditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    general?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    // Client-side Zod validation pass to provide instant feedback
    const clientValidation = projectUpdateSchema.safeParse({
      title,
      description: description || null,
    });

    if (!clientValidation.success) {
      const fieldErrors = clientValidation.error.flatten().fieldErrors;
      setErrors({
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateProjectRecord(slug, clientValidation.data);

        if (!result.success) {
          if (typeof result.error === "string") {
            setErrors({
              general:
                result.statusCode === 404
                  ? "This project could not be found or is no longer accessible."
                  : result.error,
            });
          } else {
            setErrors({
              title: result.error.title?.[0],
              description: result.error.description?.[0],
            });
          }
          return;
        }

        // Navigate client-side back to edited project detail slug
        router.push(`/projects/${result.data.slug}`);
      } catch (err) {
        setErrors({ general: "An unexpected error occurred. Please try again." });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-[var(--surface-container-low-color)] p-6 sm:p-8 rounded-xl border border-[var(--outline-variant-color)] shadow-sm"
      noValidate
    >
      {errors.general && (
        <div
          className="p-4 rounded bg-[var(--error-container-color)] text-[var(--on-error-container-color)] text-sm border border-[var(--error-color)]/20 flex items-start gap-3"
          role="alert"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 text-[var(--error-color)]"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-semibold">Update failed</p>
            <p className="mt-0.5">{errors.general}</p>
          </div>
        </div>
      )}

      <Input
        label="Project Title"
        name="title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Security Audit Dashboard"
        maxLength={100}
        error={errors.title}
        hint="Choose a descriptive title between 1 and 100 characters."
        disabled={isPending}
        autoFocus
      />

      <Textarea
        label="Project Description"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Provide an optional summary or context for this personal project..."
        charCount={description.length}
        maxChars={1000}
        error={errors.description}
        hint="Optional contextual details up to 1000 characters."
        disabled={isPending}
      />

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--outline-variant-color)]">
        <p className="text-xs text-[var(--outline-color)]">
          Changes are recorded in your immutable audit log.
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href={`/projects/${slug}`} passHref>
            <Button variant="ghost" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending || title.trim().length === 0}
            className="min-w-[140px]"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}