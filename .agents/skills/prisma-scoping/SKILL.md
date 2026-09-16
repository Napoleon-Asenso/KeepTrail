---
name: prisma-scoping
description: Use when writing or reviewing any Prisma query in KeepTrail (Record, AuditLog, User). Enforces mandatory SQL-level tenant scoping with userId, 401/404 status rules, and atomic audit-logged deletes.
---

# Prisma Query Scoping & Security

KeepTrail is a high-security micro-slice. Any Prisma query that violates these rules is a CRITICAL FAILURE.

## 1. SQL-level scoping (mandatory)

EVERY query MUST include `userId` in the `where` clause at the database level.

```typescript
// CORRECT
const record = await prisma.record.findUnique({
  where: { userId_slug: { userId: user.id, slug: slug } },
});

// FORBIDDEN — fetch by slug/id alone, then check ownership in memory
if (record.userId !== user.id) throw new Error("FORBIDDEN");
```

Never post-fetch authorize with `if (record.userId !== currentUser.id)`.

## 2. Status code & enumeration rules

- `401 Unauthorized`: missing/invalid session.
- `404 Not Found`: slug does not exist OR belongs to a different user.
- NEVER return `403` for foreign/unauthorized resources (leaks resource existence).
- Scoped queries returning `null` should map to 404 automatically.

## 3. Atomic deletion with audit

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function deleteRecordWithAudit(slug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  await prisma.$transaction(async (tx) => {
    const record = await tx.record.findUnique({
      where: { userId_slug: { userId: user.id, slug: slug } },
      select: { id: true, slug: true, title: true },
    });
    if (!record) throw new Error("NOT_FOUND");

    await tx.auditLog.create({
      data: {
        userId: user.id,
        recordSlug: record.slug,
        action: "DELETE",
        metadataJson: { deletedTitle: record.title, deletedAt: new Date().toISOString() },
      },
    });

    await tx.record.delete({
      where: { userId_slug: { userId: user.id, slug: slug } },
    });
  });

  redirect("/projects"); // OUTSIDE transaction and try/catch
}
```

## 4. Index compliance

Record MUST keep `@@unique([userId, slug])` and `@@index([userId, createdAt])`. Do not add fields not in the approved schema.