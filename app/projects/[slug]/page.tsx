import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { DeleteModal } from "@/components/delete-modal";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ProjectDetailPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      title: "Project",
      robots: { index: false, follow: false },
    };
  }

  // Scoped lookup with SQL-level tenant isolation (never fetch by slug alone)
  const record = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: params.slug,
      },
    },
    select: {
      title: true,
      description: true,
    },
  });

  if (!record) {
    return {
      title: "Not Found",
      description: "This project does not exist or is not accessible.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: record.title,
    description:
      record.description ??
      `Project details for ${record.title} in your secure KeepTrail workspace.`,
    alternates: {
      canonical: `/projects/${params.slug}`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  // MANDATORY: SQL-level query scoping using compound unique key { userId, slug }
  const record = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: params.slug,
      },
    },
    select: {
      slug: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // AC-103 & AC-104: Return 404 if record does not exist OR belongs to another user
  if (!record) {
    notFound();
  }

  const createdDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(record.createdAt));

  const updatedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(record.updatedAt));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <nav aria-label="Breadcrumb">
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

      {/* Screen 3: Detail View Card */}
      <div className="bg-[var(--surface-container-low-color)] rounded-xl border border-[var(--outline-variant-color)] p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header with Title, Status, and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-[var(--outline-variant-color)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[var(--on-surface-color)]">
                {record.title}
              </h1>
              <Badge variant="active">{record.status}</Badge>
            </div>
            <p className="text-xs text-[var(--outline-color)] font-mono">
              Slug: {record.slug}
            </p>
          </div>

          {/* Screen 4: Edit & Delete Actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link
              href={`/projects/${record.slug}/edit`}
              className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 gap-2 border border-[var(--outline-variant-color)] bg-transparent text-[var(--on-surface-color)] hover:bg-[var(--surface-container-high-color)] rounded transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--outline-color)]"
              data-testid="edit-project-link"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </Link>
            <DeleteModal slug={record.slug} projectTitle={record.title} />
          </div>
        </div>

        {/* Project Description */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--outline-color)]">
            Description
          </h2>
          {record.description ? (
            <p className="text-sm sm:text-base text-[var(--on-surface-color)] leading-relaxed whitespace-pre-wrap bg-[var(--surface-container-lowest-color)] p-4 rounded-lg border border-[var(--outline-variant-color)]/60">
              {record.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--outline-color)] italic bg-[var(--surface-container-lowest-color)] p-4 rounded-lg border border-[var(--outline-variant-color)]/60">
              No description provided for this project.
            </p>
          )}
        </div>

        {/* Timestamps & Metadata */}
        <div className="pt-4 border-t border-[var(--outline-variant-color)]/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--on-surface-variant-color)]">
          <div>
            <span className="text-[var(--outline-color)] block mb-0.5">Created</span>
            <span className="font-medium text-[var(--on-surface-color)]">{createdDate}</span>
          </div>
          <div>
            <span className="text-[var(--outline-color)] block mb-0.5">Last Updated</span>
            <span className="font-medium text-[var(--on-surface-color)]">{updatedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
