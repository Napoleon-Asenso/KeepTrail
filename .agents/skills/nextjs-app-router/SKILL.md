---
name: nextjs-app-router
description: Use when creating or modifying Next.js pages, layouts, API routes, server actions, or client components in KeepTrail. Enforces App Router + RSC defaults, no Pages Router, no extra state libs.
---

# Next.js App Router Conventions

## Non-negotiable architecture

- App Router only. NEVER use `/pages`.
- TypeScript `strict: true`. No `any`/`unknown` without a Zod guard.
- React Server Components by default. Add `"use client"` ONLY for hooks (`useState`, `useEffect`) or event handlers.

## Views (Screen mapping)

| Route              | Purpose                              |
| ------------------ | ------------------------------------ |
| `/projects`        | Screen 1: list or true empty state   |
| `/projects/new`    | Screen 2: create form                |
| `/projects/[slug]` | Screen 3: detail / Screen 4: delete  |
| `/`                | auth redirect to `/projects` or login |

## API Route pattern (`app/api/projects/route.ts`)

- `GET`: list max 50, scoped to current user, return ONLY `slug`, `title`, `description`, `createdAt`.
- `POST`: validate with Zod (`lib/validations/project.ts`), create via one Prisma call.
- Never return `id`, `userId`.

## Server Actions

- Put mutation actions in `actions/` with `"use server"`.
- Always `getCurrentUser()` first; return `{ success: false, error: "UNAUTHORIZED", statusCode: 401 }`.
- Page navigation after mutation must use `redirect()` (server) or `router.push()` (client). Never `window.location.href`.

## Client components

- Only interact via props: pass `slug`, `title`, `description`, `createdAt` — never `id`.
- Double-submit prevention: disable submit button while network pending.