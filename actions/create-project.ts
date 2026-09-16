"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectCreateSchema } from "@/lib/validations/project";

export type CreateProjectResult =
  | { success: true; data: { slug: string } }
  | { success: false; error: string | Record<string, string[]>; statusCode: number };

/**
 * Server Action to create a new project record.
 * Validates active session via getCurrentUser() and inputs via Zod schema.
 * Returns only the public 21-character NanoID slug (internal id is never returned).
 */
export async function createProject(
  input: z.infer<typeof projectCreateSchema>,
): Promise<CreateProjectResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "UNAUTHORIZED", statusCode: 401 };
  }

  const validated = projectCreateSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
      statusCode: 400,
    };
  }

  const record = await prisma.record.create({
    data: {
      userId: user.id,
      title: validated.data.title,
      description: validated.data.description,
    },
    select: {
      slug: true,
    },
  });

  return { success: true, data: { slug: record.slug } };
}
