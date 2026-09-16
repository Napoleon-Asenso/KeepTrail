import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "View and manage your personal projects in KeepTrail — a secure, tenant-isolated project tracking workspace.",
  alternates: {
    canonical: "/projects",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  // MANDATORY SQL-level tenant scoping at database level
  const records = await prisma.record.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    select: {
      slug: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header section with title and CTA button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[var(--on-surface-color)]">
            Projects
          </h1>
          <p className="text-sm text-[var(--on-surface-variant-color)] mt-1">
            Manage your personal projects with enforced multi-tenant security and audit trails.
          </p>
        </div>

        {records.length > 0 && (
          <Link href="/projects/new" passHref>
            <Button variant="primary" size="md">
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
              New Project
            </Button>
          </Link>
        )}
      </div>

      {/* Screen 1 State B: True Empty State */}
      {records.length === 0 ? (
        <EmptyState />
      ) : (
        /* Screen 1 State A: Populated Grid (Max 50 items) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="projects-grid">
          {records.map((project) => {
            const formattedDate = new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(project.createdAt));

            return (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="group block p-5 rounded-xl bg-[var(--surface-container-low-color)] border border-[var(--outline-variant-color)] hover:border-[var(--primary-color)]/60 hover:shadow-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
                data-testid={`project-card-${project.slug}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="text-base font-semibold text-[var(--on-surface-color)] group-hover:text-[var(--primary-color)] transition-colors line-clamp-1">
                    {project.title}
                  </h2>
                  <Badge variant="active">{project.status}</Badge>
                </div>

                {project.description ? (
                  <p className="text-sm text-[var(--on-surface-variant-color)] line-clamp-2 mb-4 leading-relaxed">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--outline-color)] italic mb-4">
                    No description provided
                  </p>
                )}

                <div className="pt-3 border-t border-[var(--outline-variant-color)]/60 flex items-center justify-between text-xs text-[var(--outline-color)]">
                  <span>Created {formattedDate}</span>
                  <span className="group-hover:translate-x-0.5 transition-transform text-[var(--primary-color)] font-medium inline-flex items-center gap-1">
                    View
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
