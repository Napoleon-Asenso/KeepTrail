import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditForm } from "@/components/edit-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface EditProjectPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: EditProjectPageProps): Promise<Metadata> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      title: "Edit Project",
      robots: { index: false, follow: false },
    };
  }

  // Scoped lookup with SQL-level tenant isolation
  const record = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: params.slug,
      },
    },
    select: {
      title: true,
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
    title: `Edit ${record.title}`,
    description: `Update ${record.title} in your secure KeepTrail workspace.`,
    alternates: {
      canonical: `/projects/${params.slug}/edit`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
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
    },
  });

  // Return 404 if the record does not exist OR belongs to another user
  if (!record) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation & header */}
      <div>
        <nav aria-label="Breadcrumb" className="mb-3">
          <Link
            href={`/projects/${record.slug}`}
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
            Back to Project
          </Link>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[var(--on-surface-color)]">
          Edit Project
        </h1>
        <p className="text-sm text-[var(--on-surface-variant-color)] mt-1">
          Update &ldquo;{record.title}&rdquo;. Every change is recorded in your immutable audit log.
        </p>
      </div>

      {/* Edit Form Component */}
      <EditForm
        slug={record.slug}
        initialTitle={record.title}
        initialDescription={record.description}
      />
    </div>
  );
}