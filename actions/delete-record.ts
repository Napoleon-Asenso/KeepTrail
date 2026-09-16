"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Atomically records an audit log entry and deletes the project record.
 * Uses Prisma interactive transaction ($transaction) to ensure atomic audit persistence.
 * Query is strictly scoped to userId_slug compound unique key.
 * Redirect to /projects is executed OUTSIDE of transaction and try/catch block.
 */
export async function deleteRecordWithAudit(slug: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Verify existence & ownership strictly inside transaction
    const record = await tx.record.findUnique({
      where: {
        userId_slug: { userId: user.id, slug: slug },
      },
      select: { id: true, slug: true, title: true },
    });

    if (!record) {
      throw new Error("NOT_FOUND");
    }

    // 2. Persist audit log entry BEFORE/DURING record deletion
    await tx.auditLog.create({
      data: {
        userId: user.id,
        recordSlug: record.slug,
        action: "DELETE",
        metadataJson: {
          deletedTitle: record.title,
          deletedAt: new Date().toISOString(),
        },
      },
    });

    // 3. Perform hard delete with compound scoping
    await tx.record.delete({
      where: {
        userId_slug: { userId: user.id, slug: slug },
      },
    });
  });

  // Redirect executed OUTSIDE transaction and try/catch blocks
  redirect("/projects");
}
