"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectUpdateSchema } from "@/lib/validations/project";

export type UpdateProjectResult =
  | { success: true; data: { slug: string } }
  | { success: false; error: string | Record<string, string[]>; statusCode: number };

/**
 * Server Action to update an existing project record.
 * Validates the active session via getCurrentUser() and inputs via Zod schema.
 * Performs ownership/existence verification and the update strictly scoped by
 * the { userId, slug } compound unique key at the SQL level.
 * A transactional UPDATE audit log entry is persisted atomically with the change.
 * Returns only the public 21-character NanoID slug.
 */
export async function updateProjectRecord(
  slug: string,
  input: z.infer<typeof projectUpdateSchema>,
): Promise<UpdateProjectResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "UNAUTHORIZED", statusCode: 401 };
  }

  const validated = projectUpdateSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
      statusCode: 400,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Verify existence & ownership strictly inside transaction
      const record = await tx.record.findUnique({
        where: {
          userId_slug: { userId: user.id, slug: slug },
        },
        select: { slug: true, title: true, description: true },
      });

      if (!record) {
        throw new Error("NOT_FOUND");
      }

      // 2. Persist audit log entry BEFORE/DURING the update
      await tx.auditLog.create({
        data: {
          userId: user.id,
          recordSlug: record.slug,
          action: "UPDATE",
          metadataJson: {
            previousTitle: record.title,
            previousDescription: record.description,
            updatedTitle: validated.data.title,
            updatedDescription: validated.data.description,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      // 3. Perform scoped update with compound unique key
      await tx.record.update({
        where: {
          userId_slug: { userId: user.id, slug: slug },
        },
        data: {
          title: validated.data.title,
          description: validated.data.description,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { success: false, error: "NOT_FOUND", statusCode: 404 };
    }
    throw err;
  }

  return { success: true, data: { slug } };
}