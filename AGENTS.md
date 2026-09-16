
# AGENTS.md — System Instructions & Security Boundaries
**Product Slice:** Assessment 4: The Records and Access Slice (Personal Projects Management)
**Target Audience:** AI Coding Agents (Cursor, Windsurf, Antigravity) & Autonomous Engineers

---

## 1. Project & Source of Truth

* **Ultimate Functional Source of Truth:** `PRD.md` (Approved Revision V2.0). All feature requirements, entity schemas, and user journeys are anchored strictly in the PRD[cite: 4].
* **Role of `AGENTS.md`:** This document defines the **execution constraints, security rules, system architecture, and quality rules** that the AI agent MUST strictly observe while building the product slice.
* **Product Scope:** A high-security personal projects management micro-slice providing Create, Read/List, Detail, and Delete (CRD) operations with tenant isolation and transactional auditing[cite: 4].
* **Core Rule of Execution:** Functional code that violates any security boundary, query scoping pattern, or type strictness rule defined in this document is considered a **CRITICAL FAILURE** and must be refactored immediately.

---

## 2. Locked Stack & Technical Boundaries

You MUST NOT install, swap, or introduce alternative frameworks, libraries, or ORMs. The technology stack is locked[cite: 4]:

* **Framework:** Next.js (App Router only; no Pages Router)[cite: 4]
* **Language:** TypeScript (`strict: true` mode enforced)[cite: 4]
* **Database:** PostgreSQL[cite: 4]
* **ORM:** Prisma ORM[cite: 4]
* **Authentication:** Session-based authentication via `getCurrentUser()` server helper[cite: 4]
* **Input Validation:** Zod schema validation[cite: 4]

### Explicitly Forbidden Stack Additions:
* **NO Alternative ORMs:** Do not use Drizzle, Kysely, TypeORM, or raw SQL.
* **NO Alternative Routing/State:** Do not use Redux, Zustand, React Query/TanStack Query, or Pages Router conventions (`/pages`).
* **NO Unapproved UI Component Kits:** Do not install external component ecosystem frameworks unless explicitly configured. Use native Tailwind CSS and React primitives.

---

## 3. Non-Negotiable Security & Business Orders ("What Must Never Happen")

### 1. Mandatory SQL-Level Database Query Scoping
* **COMMAND:** ALWAYS scope every Prisma query directly at the database level by including `userId` in the `where` clause (e.g., using `userId_slug: { userId: currentUserId, slug: recordSlug }`)[cite: 4].
* **PROHIBITION:** NEVER fetch a record by `slug` or `id` alone and evaluate ownership in JavaScript memory (e.g., `if (record.userId !== currentUser.id)`). Memory-based post-fetch authorization is strictly forbidden[cite: 4].

### 2. Public Identifier Exposure Rules
* **COMMAND:** Expose ONLY public 21-character NanoID/UUID strings (`slug`) in API route path parameters, dynamic pages, client components, and JSON payloads[cite: 4].
* **PROHIBITION:** NEVER expose internal auto-incrementing primary key integer IDs (`id`) in URLs, DOM data attributes, public API responses, or client-side props[cite: 4].

### 3. Status Code & Enumeration Mitigation Standards
* **COMMAND:** Return status `401 Unauthorized` for missing/invalid sessions[cite: 4]. Return status `404 Not Found` whenever a requested resource slug does not exist OR belongs to a different user[cite: 4].
* **PROHIBITION:** NEVER return `403 Forbidden` for foreign or unauthorized resource requests[cite: 4]. Returning `403` leaks the existence of private resources to potential attackers (resource enumeration vulnerability)[cite: 4].

### 4. Atomic Audit Logging Operations
* **COMMAND:** Execute all record deletions strictly inside a Prisma interactive transaction (`prisma.$transaction`)[cite: 4]. The audit log entry in `audit_logs` MUST be persisted prior to or simultaneously with record removal[cite: 4].
* **COMMAND:** Execute `redirect('/projects')` OUTSIDE of the transaction block and outside of any outer `try/catch` block (to prevent Next.js navigation error capture)[cite: 4].

### 5. Functional Scope Guardrails ("Do Not Build")
* **PROHIBITION:** Absolutely NO project updating/editing logic or UI components (records are immutable post-creation)[cite: 4].
* **PROHIBITION:** NO tag, taxonomy, or category fields[cite: 4].
* **PROHIBITION:** NO search input boxes, filter toggles, or sorting controls[cite: 4].
* **PROHIBITION:** NO team sharing, permissions, or collaborative RBAC models[cite: 4].
* **PROHIBITION:** NO landing pages or public marketing pages[cite: 4].

---

## 4. Directory Structure & System Architecture

The agent MUST organize code according to the following Next.js App Router tree[cite: 4]:

```text
.
├── app/
│   ├── api/
│   │   └── projects/
│   │       ├── route.ts              # GET (list max 50), POST (create)
│   │       └── [slug]/
│   │           └── route.ts          # GET (detail)
│   ├── projects/
│   │   ├── page.tsx                  # Screen 1: List View (Populated vs True Empty State)[cite: 4]
│   │   ├── new/
│   │   │   └── page.tsx              # Screen 2: Create View
│   │   └── [slug]/
│   │       └── page.tsx              # Screen 3 & 4: Detail View & Delete Confirmation
│   ├── layout.tsx
│   └── page.tsx                      # Auth check redirect -> /projects or login[cite: 4]
├── actions/
│   └── delete-record.ts              # deleteRecordWithAudit Server Action
├── components/
│   ├── ui/                           # Primitive UI elements
│   ├── empty-state.tsx               # Screen 1 State B True Empty State
│   ├── create-form.tsx               # Zod-validated client creation form
│   └── delete-modal.tsx              # Client modal overlay for delete confirmation
├── lib/
│   ├── auth.ts                       # getCurrentUser() server helper[cite: 4]
│   ├── prisma.ts                     # Singleton Prisma Client instance[cite: 4]
│   └── validations/
│       └── project.ts                # Zod schemas (title, description)
├── prisma/
│   └── schema.prisma                 # Explicit Prisma Data Model
└── public/
5. Code Style & Quality Standards
TypeScript Strictness
No usage of any. Explicitly type all function parameters, return types, and API responses.

Use Zod schemas to derive types (z.infer<typeof projectSchema>) for client form inputs and API payload validation.  

Prisma Singleton Pattern (lib/prisma.ts)  
To prevent connection exhaustion during Next.js hot-reloading in development, the agent MUST use a global singleton pattern:  

TypeScript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
Exact Prisma Schema (prisma/schema.prisma)
The agent MUST mirror this schema configuration exactly:

Code snippet
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  createdAt DateTime   @default(now()) @map("created_at")
  records   Record[]
  auditLogs AuditLog[]

  @@map("users")
}

model Record {
  id          Int      @id @default(autoincrement())
  slug        String   @unique @default(nanoid())
  userId      String   @map("user_id")
  title       String
  description String?
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, slug])
  @@index([userId, createdAt])
  @@map("records")
}

model AuditLog {
  id           Int      @id @default(autoincrement())
  userId       String   @map("user_id")
  action       String   // "DELETE"
  recordSlug   String   @map("record_slug")
  metadataJson Json?    @map("metadata_json")
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: NoAction)

  @@index([userId])
  @@index([recordSlug])
  @@map("audit_logs")
}
Pattern Reference: Server Action for Deletion (actions/delete-record.ts)
The agent MUST implement deletion using this atomic pattern:

TypeScript
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

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
6. Definition of Done (Mandatory Verification Checklist)
Before declaring a task or phase complete, the AI agent must verify all the following requirements:

[ ] Zero Compilation Errors: Running tsc --noEmit and npm run build succeeds without TypeScript or ESLint errors.

[ ] Prisma Index Compliance: Verified that Record schema contains @@unique([userId, slug]) and @@index([userId, createdAt]).

[ ] Scoping Verification: Confirmed that every single Prisma query (findMany, findUnique, delete) uses userId explicitly in the where block.

[ ] True Empty State: Tested Screen 1 (/projects) with 0 records returned. Renders explicit empty state with CTA ("Create Your First Project") and no broken skeletons or empty table headers.

[ ] Double-Submit Prevention: Confirmed creation form button disables upon submit during network pending state.

[ ] No ID Exposure: Verified browser URLs, dynamic routes, and client props expose ONLY 21-character NanoID slugs[cite: 4].

[ ] Audit Trail Integrity: Confirmed deletion of a record generates a corresponding row in audit_logs retaining the deleted record's slug and metadata.

[ ] 404 Behavior Check: Requesting a valid slug that belongs to User A while authenticated as User B returns an HTTP 404 Not Found error (NOT 403).

7. Ambiguity & Scope Escalation Rules ("When Unsure")
Stop & Ask: If a requirement in a task appears to conflict with the PRD or requires features outside the explicit scope (e.g., adding an edit form, soft-deleting, adding status dropdowns, or adding tags), the agent MUST STOP and ask the developer for confirmation[cite: 4].

Never Speculate: The agent must never invent new database fields (e.g., isDeleted, updatedBy, tags, role) not declared in the approved Prisma Schema.

No Unrequested Refactoring: Do not refactor auth helpers, global configuration files, or database schemas outside the explicit bounds of the task.