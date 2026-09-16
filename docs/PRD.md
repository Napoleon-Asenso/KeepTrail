# Assessment 4: The Records and Access Slice — Approved Final Revision

> Converted from `Assessment_4_PRD_Reviewed.pdf` to Markdown.

Product Requirements Document (PRD)
Assessment 4: The Records and Access Slice — Approved Final Revision
Target Stack: Next.js (App Router), TS, Prisma,
Postgres
Auth Model: Session-based
Auth
Status:
APPROVED - V2.0
1. PRODUCT SUMMARY
Assessment 4: The Records and Access Slice is a production-grade micro-slice of a Personal Projects
Management system built on Next.js (App Router), TypeScript, Prisma, and PostgreSQL. It delivers secure CRD
operations (Create, Read/List, Detail, and Delete) for personal project records. The system guarantees multi-tenant
security through enforced database query scoping ( userId  isolation) as the primary authorization boundary,
augmented by unguessable URL slug abstraction (21-character NanoIDs) to prevent endpoint enumeration and
hiding internal primary keys.
2. PROBLEM STATEMENT
In multi-tenant SaaS applications, authorization bugs such as Insecure Direct Object References (IDOR) often
occur when developers rely on client-side state, post-fetch filtering in memory, or predictable database primary
keys (sequential integers). Furthermore, non-atomic deletion operations cause silent audit log failures, leaving
security teams blind to data removal events.
This product slice solves these core vulnerabilities by enforcing strict SQL-level data isolation via mandatory 
userId  scoping in all Prisma WHERE  clauses, optimizing query execution via compound indexes/keys on 
(user_id, slug)  and (user_id, created_at) , using unguessable public slugs for client routing, and
executing atomic $transaction  blocks to log security audits prior to record deletion.
3. GOALS AND NON-GOALS
Goals
Tenant Isolation: Enforce standard row-level tenant boundaries by including userId  directly in the WHERE
condition of every database operation.
IDOR Prevention: Completely eliminate sequential integer IDs in public APIs and dynamic App Router routes
using NanoID/UUID public slugs.
Atomic Deletion Auditing: Ensure deletion logs are transactionally bound to record removal via Prisma 
$transaction .
Database Efficiency: Optimize read and authorization check latency through compound unique keys on 
(user_id, slug)  and compound indexes on (user_id, created_at) .
• 
• 
• 
• 
Assessment 4: The Records and Access Slice — Approved PRD
Page 1 of 8

Clear Authorization Failure Semantics: Standardize security responses strictly between Unauthenticated
( 401 Unauthorized ) for missing/invalid sessions and Not Found ( 404 Not Found ) for both missing records
and cross-tenant access attempts (preventing resource enumeration).
Non-Goals (Explicit "Do Not Build" Boundaries)
No Project Editing/Updating: Records are immutable post-creation for this assessment slice.
No Tags, Categories, or Taxonomy: Plain title and description string fields only.
No Full-Text Search or Filtering: No keyword search, status filter toggles, or sorting controls.
No Sharing or Collaboration: Records are strictly private to the owning user; no RBAC, teams, or shared
access models.
No Marketing or Landing Pages: Direct routing to authenticated list views or login redirects only.
4. USER PERSONAS & CORE USER JOURNEYS
User Personas
Primary User (Project Owner): An authenticated user who creates, reviews, and cleans up personal project
entries. Requires low-latency page loads and immediate visual confirmation of mutations.
Security Auditor: An internal reviewer validating that users cannot access, guess, or delete other users'
records, and that all destructive actions produce immutable audit logs.
Core User Journeys
List & View Projects: Authenticated user navigates to /projects . System verifies session, queries bounded
records strictly scoped to userId  (max 50 records), and renders list or true empty state.
Create Project: User submits title and description at /projects/new . Server Action validates via Zod,
generates a public 21-character NanoID slug, writes to PostgreSQL, and invokes redirect('/projects/
[slug]') .
Inspect Project Detail: User views /projects/[slug] . Route fetches record matching compound unique
key { userId, slug } . If slug belongs to another user or doesn't exist, renders 404 error page.
Delete Project with Audit: User clicks "Delete" on /projects/[slug] . Server Action verifies ownership
inside a $transaction , inserts audit log into audit_logs , deletes record from records  using compound
scoping, and executes redirect('/projects')  outside transaction block.
5. FUNCTIONAL REQUIREMENTS
Screen 1: List View ( /projects )
State A (Populated): Renders a grid/list of records owned by the logged-in user (bounded to 50 items).
Displays title, read-only status badge ( ACTIVE ), and formatted created_at .
State B (True Empty State): When query returns [] , renders explicit empty state component with CTA button
("Create Your First Project") pointing to /projects/new . Must not show broken skeletons or empty table
headers.
• 
• 
• 
• 
• 
• 
• 
• 
1. 
2. 
3. 
4. 
• 
• 
Assessment 4: The Records and Access Slice — Approved PRD
Page 2 of 8

Screen 2: Create View ( /projects/new )
Form Inputs & Validation: Server parses input with Zod: title  (string, required, 1-100 chars), 
description  (string, optional, max 1000 chars). Invalid inputs return structured field errors without DB
execution.
Submission & Redirection: Disables submit button to prevent double-posting. Server generates 21-char
NanoID slug, creates record, and redirects to /projects/[slug] .
Screen 3: Detail View ( /projects/[slug] )
Data Display: Renders title, description, system status ( ACTIVE ), created_at , and updated_at .
Action Controls: Contains primary "Delete Project" button triggering Delete Confirmation Modal.
Screen 4: Delete Confirmation (Modal Overlay on /projects/[slug] )
Interaction & Execution: Client component modal overlay confirming deletion. On confirm, invokes 
deleteRecordWithAudit  Server Action with loading spinner. Upon success, redirects to /projects .
• 
• 
• 
• 
• 
Assessment 4: The Records and Access Slice — Approved PRD
Page 3 of 8

6. TECHNICAL REQUIREMENTS
API Endpoints & Server Actions
Method /
Handler
Route / Action
Description
Expected Status Codes
GET
/api/projects
Fetch all records for active session
user (max 50)
200 OK, 401 Unauthorized
POST
/api/projects
Create a new project record (Zod
validated)
201 Created, 400 Bad Request,
401 Unauthorized
GET
/api/projects/[slug]
Fetch specific record details by
compound unique lookup
200 OK, 401 Unauthorized, 404
Not Found
DELETE  /
Action
deleteRecordWithAudit
Atomically log audit event and
delete project
200 OK, 401 Unauthorized, 404
Not Found
Strict Query Scoping Rule
// MANDATORY session-scoped query pattern using Prisma compound unique key
const record = await prisma.record.findUnique({
  where: {
    userId_slug: {
      userId: currentUserId, // ENFORCED: Session scoped
      slug: recordSlug,
    },
  },
});
Status Code Standards
401 Unauthorized: Returned immediately when no valid session exists.
404 Not Found: Returned when a requested slug does not exist OR belongs to a different user. Returning 403
on foreign resources is strictly forbidden as it leaks resource existence.
7. EXACT PRISMA DATA MODEL
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
• 
• 
Assessment 4: The Records and Access Slice — Approved PRD
Page 4 of 8

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
  action       String   // Value: "DELETE"
  recordSlug   String   @map("record_slug")
  metadataJson Json?    @map("metadata_json")
  createdAt    DateTime @default(now()) @map("created_at")
  // Retain audit logs even if User record is modified/deleted; no cascading purge
  user User @relation(fields: [userId], references: [id], onDelete: NoAction)
  @@index([userId])
  @@index([recordSlug])
  @@map("audit_logs")
}
8. SECURITY & ACCESS CONTROL ARCHITECTURE
Atomic Audit Logging Transaction Implementation
"use server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export async function deleteRecordWithAudit(slug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  await prisma.$transaction(async (tx) => {
    // 1. Verify existence & ownership inside transaction using compound unique key
    const record = await tx.record.findUnique({
      where: {
        userId_slug: { userId: user.id, slug: slug },
Assessment 4: The Records and Access Slice — Approved PRD
Page 5 of 8

},
      select: { id: true, slug: true, title: true },
    });
    if (!record) throw new Error("NOT_FOUND");
    // 2. Write immutable audit log entry FIRST
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
    // 3. Perform hard delete enforcing session user scoping
    await tx.record.delete({
      where: {
        userId_slug: { userId: user.id, slug: slug },
      },
    });
  });
  // Redirect invoked outside transaction and try/catch block
  redirect("/projects");
}
Query Performance Optimization
Metric
Non-Optimized Architecture
Optimized PRD Architecture
Queries per Detail View
2 (findFirst by ID, verify userId)
1 (findUnique using userId_slug  key)
Queries per Deletion
3 DB round-trips
3 operations inside 1 $transaction  block
Index Strategy
Single-column Primary Keys
Compound Unique (user_id, slug)
9. RISKS & THREAT MODEL
#
Threat
Mitigation
1
URL Tampering / Slug Probing
Attacker iterates NanoIDs in URL
21-char NanoID space (2^126 entropy) + DB return 404 on tenant mismatch
2
Post-Fetch Authorization Leak
Developer queries by slug alone,
checks in JS
Strict Linter/CI Rule + mandatory Prisma userId_slug  compound unique
key clause
3
Missing Compound Indexes
Query response scales linearly O(N)
Schema enforcement of @@unique([userId, slug])  and 
@@index([userId, createdAt])
Assessment 4: The Records and Access Slice — Approved PRD
Page 6 of 8

#
Threat
Mitigation
4
Concurrent Deletion Double-Audit
Parallel DELETE requests duplicate
audit entries
Transaction isolation; second query fails finding record with 404
NOT_FOUND  and rolls back
10. KEY SUCCESS METRICS & EVIDENCE COLLECTION PLAN
Access Control Audit Matrix
Test
Case
Request Context
Target
Resource
Expected
Status
Prisma Query Clause Verified
AC-101
Unauthenticated
Session
User A Record
401
Unauthorized
N/A (Middleware/Auth Check)
AC-102
Authenticated User A
User A Record
200 OK
where: { userId_slug: { userId:
"A", slug } }
AC-103
Authenticated User B
User A Record
404 Not Found
where: { userId_slug: { userId:
"B", slug } }
AC-104
Authenticated User B
Non-Existent
Slug
404 Not Found
where: { userId_slug: { userId:
"B", slug } }
11. STATED ASSUMPTIONS LIST
[ASSUMPTION]  Session authentication is verified via a server-side helper function ( getCurrentUser() )
inside Server Components, Server Actions, and Route Handlers, utilizing encrypted HTTP-only session
cookies.
[ASSUMPTION]  Database connection pooling is managed via standard PostgreSQL session pools (e.g.,
PgBouncer) capable of handling interactive transactions.
[ASSUMPTION]  Delete action is permanent (hard delete); soft-deletes are out of scope for this assessment
slice.
12. PHASED IMPLEMENTATION ROADMAP
Phase 1 (Database Schema & Migration): Implement User, Record, and AuditLog models with 
@@unique([userId, slug]) , @@index([userId, createdAt]) , and @@index([recordSlug]) . Execute 
npx prisma migrate dev .
Phase 2 (Data Access Layer & Scoping): Construct reusable, strictly scoped access functions using 
userId_slug . Implement unit tests verifying missing session parameters throw exceptions.
Phase 3 (Route Handlers & Server Actions): Implement Next.js App Router dynamic paths ( /projects/
[slug] ) and build standard error handlers mapping 401  and 404  responses.
• 
• 
• 
• 
• 
• 
Assessment 4: The Records and Access Slice — Approved PRD
Page 7 of 8

Phase 4 (Frontend UI Views & States): Develop List View with []  empty state, Project Creation Form, Detail
View, and Delete Confirmation Modal Overlay.
Phase 5 (Security Audit & Evidence Packaging): Execute multi-tenant scenario tests across dual user
accounts, capture query execution logs, and export DB audit log dumps confirming transactional persistence.
13. OPEN QUESTIONS (RESOLVED)
Q1 RESOLVED: Standardized on 21-character NanoIDs using Prisma's @default(nanoid())  for clean,
unguessable public URLs.
Q2 RESOLVED: Rate limiting must be enforced on /api/projects/[slug]  and deletion Server Actions (e.g.,
max 60 requests/min per userId ) using sliding window rate limiting.
APPENDIX: KEY FLAWS CORRECTED DURING REVIEW
[CRITICAL] Fixed AuditLog.user  cascading delete ( onDelete: Cascade  → NoAction ) to preserve
security audit history if user records are removed.
[CRITICAL] Enforced compound scoping userId_slug  on the actual deletion query in 
deleteRecordWithAudit  to eliminate unscoped primary key deletes.
[HIGH] Upgraded Record  compound index to @@unique([userId, slug])  to enable Prisma's 
findUnique  type-safe query engine.
[HIGH] Eliminated 403 Forbidden  response on resource endpoints to prevent resource existence
enumeration.
[MEDIUM] Fixed Next.js App Router session extraction assumptions (replaced middleware req mutation with 
getCurrentUser()  server helper).
• 
• 
• 
• 
1. 
2. 
3. 
4. 
5. 
Assessment 4: The Records and Access Slice — Approved PRD
Page 8 of 8
