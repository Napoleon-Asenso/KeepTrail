---
trigger: always_on
---

# Public URL & Slug Routing Rules

## 1. Public Identifier Exposure Rules

- Primary key integer IDs (`id`) MUST NEVER be exposed in public API payloads, dynamic URL routes, client component props, or HTML DOM data attributes.
- Public dynamic routes MUST exclusively use dynamic slug parameters: `/projects/[slug]`.
- Slugs MUST be generated as unguessable 21-character NanoIDs (`@default(nanoid())` in Prisma schema).

## 2. Next.js Client Navigation Standards

- URL transitions following mutation events (e.g., redirecting to detail page after project creation, or redirecting to project list after project deletion) MUST use Next.js navigation (`redirect('/projects')` or `router.push()`).
- NEVER perform full-page hard reloads (`window.location.href = ...`) for application route navigation.

```typescript
// CORRECT REDIRECT IN SERVER ACTION
import { redirect } from "next/navigation";

export async function createProjectAction(formData: FormData) {
  // ... validation and creation logic ...

  // Triggers client-side state navigation to new slug
  redirect(`/projects/${newRecord.slug}`);
}
```