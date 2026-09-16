---
trigger: always_on
---

Coding Standards & Next.js App Router Architecture

1. Core Architecture & Strict Framework Rules
   ALWAYS use the Next.js App Router (`/app` directory). NEVER create or reference the Pages Router (`/pages`).
   ALWAYS enforce TypeScript strict mode (`"strict": true` in `tsconfig.json`).
   NEVER use `any` or `unknown` as explicit types unless strictly narrowing with a Zod guard or type predicate.
   React Server Components (RSC) MUST be the default for all views and layouts. Mark components with `"use client"` ONLY when state (`useState`), effects (`useEffect`), or client event listeners are strictly required.
2. Server Action & API Route Handler Patterns
   ALL dynamic mutations (e.g., project creation, project deletion) MUST be implemented using Next.js Server Actions in an `actions/` directory or declared directly inside dedicated modules with `"use server"`.
   Server Actions and API Route Handlers MUST extract and validate the active session using the `getCurrentUser()` server helper before executing any business logic.
   Payload validation MUST be executed using Zod schemas defined in `lib/validations/`.

```typescript
// STANDARD SERVER ACTION PATTERN
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectCreateSchema } from "@/lib/validations/project";

export async function createProject(
  input: z.infer<typeof projectCreateSchema>,
) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "UNAUTHORIZED", statusCode: 401 };
  }

  const validated = projectCreateSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten(),
      statusCode: 400,
    };
  }

  const record = await prisma.record.create({
    data: {
      userId: user.id,
      title: validated.data.title,
      description: validated.data.description,
    },
  });

  return { success: true, data: { slug: record.slug } };
}
```
