---
name: zodd-validation
description: Use when defining or modifying form inputs, API payloads, or data validation in KeepTrail. Enforces Zod as the single validation source with derived types.
---

# Zod Validation Standards

KeepTrail uses Zod as its ONLY validation and type-source mechanism.

## Schema files

All schemas live in `lib/validations/`. The `Record` schema is `lib/validations/project.ts`.

| Field         | Rules                                              |
| ------------- | -------------------------------------------------- |
| `title`       | string, trim, min 1, max 100, required             |
| `description` | string, trim, max 1000, optional (nullable)        |

## Derived types

Always derive types from the schema — never hand-declare input interfaces.

```typescript
import { z } from "zod";
import { projectCreateSchema } from "@/lib/validations/project";

export async function createProject(input: z.infer<typeof projectCreateSchema>)
```

## Client form + server action in sync

`components/create-form.tsx` uses the SAME schema (via `useActionState`/client-side `.safeParse`) so client rules and server rules can never drift.

## Calling patterns

```typescript
const validated = projectCreateSchema.safeParse(input);
if (!validated.success) {
  return { success: false, error: validated.error.flatten(), statusCode: 400 };
}
```

- `safeParse` in boundary handlers; `parse` only where throw-on-invalid is acceptable.
- Never use `any` for form state or payloads.
- Do not invent fields (tags, status dropdowns, edit payloads) outside the approved schema.