# KeepTrail — Assessment 4: The Records and Access Slice

## Section 1: What This Is

KeepTrail is a personal projects management micro-slice: an authenticated user can create a project, see a list of their own projects, open one to read its details, and delete it. Every record lives in its own tenant partition — the only state a user can ever read or affect is the state that belongs to that user, enforced at the database level, not in the application layer. The whole product is four screens (`/` sign-in, `/projects` list, `/projects/new` create, `/projects/[slug]` detail+delete) backed by one REST API surface (`/api/projects` and `/api/projects/[slug]`) and one server action (`actions/delete-record.ts`). Deletion is the only mutation that changes existing state, and it is always recorded: before a record is removed, an immutable `audit_logs` row is written inside the same database transaction, so a deletion without an audit trail is structurally impossible.

Deliberately not included: project editing (records are immutable once created), search, filtering, sorting, tags or taxonomies, team sharing or RBAC, and landing/marketing pages. These are all explicitly out of scope for this slice. The interesting work here is not CRUD — it is the access model. The slice exists to demonstrate SQL-level tenant scoping, non-enumerable public identifiers, unambiguous 401/404 semantics, atomic audit-logged deletion, and a measured reduction in database query counts. Adding an edit form or a search box would dilute that focus, so none of them exist.

## Section 2: How To Run It

1. **Install prerequisites.** Node.js 18.17+ (Next.js 14 requirement) and PostgreSQL 15+ running locally. On Windows, install Node from nodejs.org and Postgres from postgresql.org; on macOS, `brew install node postgresql@15`.
2. **Clone and install dependencies.** `git clone <repo> && cd KeepTrail && npm install`.
3. **Set the environment variables.** We commit `.env.example` (see below) exactly as it appears in the repo — a commented placeholder with no secrets. Real keys are never committed.
4. **Point the database at a real Postgres.** Copy the example file to `.env`, replace the connection string with your local Postgres, then:
   ```
   npx prisma generate
   npx prisma migrate dev --name init
   ```
   This creates the `users`, `records`, and `audit_logs` tables described in Section 4 and generates the Prisma client.
5. **Start the app.** `npm run dev`. The app appears at `http://localhost:3000`.
6. **Optional measurement/repro scripts** (all pass against a running instance; they create and clean up their own test data):
   - `node scripts/test-e2e-endpoints.mjs` — endpoint + access-control HTTP tests.
   - `node scripts/verify-matrix.mjs` — access-control + audit-trail DB-level tests.
   - `node scripts/measure-query-counts.mjs` — per-action query-count benchmark.

**`.env.example`** (committed, placeholders only):

```bash
# PostgreSQL connection string. Create this database locally before the first migrate.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keeptrail?schema=public"

# Optional: canonical public origin used to build SEO metadata (metadataBase).
# Leave unset for local development; set to your deployed origin in production.
# NEXT_PUBLIC_SITE_URL="https://keeptrail.example.com"
```

A reviewer who cannot reach a working instance in under ten minutes is being held up by their database, not by this repository.

## Section 3: The Flow, Step By Step

**Step 1 — Sign in (or not).** A visitor lands on `/` (`app/page.tsx`). The page calls `getCurrentUser()` (`lib/auth.ts`), which resolves identity from an `x-user-email` HTTP header or the `session_email` cookie. If a user is already resolved, `page.tsx` redirects to `/projects`. Otherwise it renders `SignInForm` (`components/sign-in-form.tsx`). The user types any plausible email and submits; the client writes `session_email` to a same-site cookie and calls `router.push("/projects")`. No email is sent anywhere — there is no mailer in this project (grep `smtp|nodemailer|sendgrid|magic`, and there is nothing). A correct email simply gets the user in. If the email is new, the first authenticated server call auto-provisions a row in `users`.

**Step 2 — List projects.** `/projects` (`app/projects/page.tsx`) is a server component marked `force-dynamic`. It calls `getCurrentUser()`; unauthenticated users are redirected to `/`. Authenticated users hit one Prisma query: `record.findMany` filtered by `userId`, ordered `createdAt desc`, capped at 50, selecting only public fields. The returned array is either empty — which renders the true empty state (`components/empty-state.tsx`, `data-testid="true-empty-state"`) — or a grid of project cards. Each card links to `/projects/<slug>` where `<slug>` is the 21-character NanoID.

**Step 3 — Create a project.** The "New Project" button leads to `/projects/new` (`app/projects/new/page.tsx`) which renders `CreateForm` (`components/create-form.tsx`). On submit, the client validates the payload with the Zod schema (`lib/validations/project.ts`), disables the button while pending, and calls the server action `createProject` (`actions/create-project.ts`). The action re-validates with Zod, resolves the user, and inserts a row with `userId` taken from the session — never from the payload. It returns only the new `slug`, and the client navigates to `/projects/<slug>`. The same create logic is exposed over HTTP as `POST /api/projects` (`app/api/projects/route.ts`) with identical Zod validation and scoping.

**Step 4 — Read project details.** The detail screen (`app/projects/[slug]/page.tsx`) receives `slug` from the URL. It resolves the user and runs `record.findUnique` on the compound key `{ userId, slug }`. If the row does not exist for *this* user, it returns `notFound()` → HTTP 404. The page also exports `generateMetadata`, which performs the same scoped lookup to produce a `<title>` equal to the record title (an SEO nicety, Section 5). `GET /api/projects/[slug]` (`app/api/projects/[slug]/route.ts`) is the HTTP mirror of this screen and uses the identical compound-key lookup.

**Step 5 — Delete a project.** On the detail screen, "Delete Project" opens `DeleteModal` (`components/delete-modal.tsx`). Confirming invokes the server action `deleteRecordWithAudit(slug)` (`actions/delete-record.ts`). Inside a Prisma interactive transaction the action (a) looks the record up by `{ userId, slug }`, (b) writes an `audit_logs` row with the deleted slug, title, and timestamp, and (c) hard-deletes the record. If the lookup returns nothing (foreign slug, wrong owner, already deleted) the transaction throws `NOT_FOUND` and nothing is written. `redirect("/projects")` runs outside the transaction and outside any `try/catch`, as the Next.js guidance requires. The user lands back on the list, which now renders without the deleted record.

## Section 4: The Data Model

The schema lives in `prisma/schema.prisma` and is reproduced here exactly.

```prisma
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
```

**`users`** holds one row per tenant identity. `id` is a UUID — we use a UUID, not an auto-increment, precisely because this id is the inner join key across `records` and `audit_logs` and we never want it guessable. `email` is `@unique` because email is the login identifier: two rows with the same email would silently split one tenant into two.

**`records`** holds the projects. `id` is an auto-increment integer: it is the surrogate primary key used by Prisma for index clustering and is *never* exposed to the client (Section 5, "Why raw database identifiers are not exposed"). `slug` is a 21-character NanoID with its own `@unique`, and it is the only record identifier that ever appears in URLs or JSON. `userId` is the tenant partition key, FK to `users`, `onDelete: Cascade` so deleting a user cannot strand ownerless rows. `title` is `String`, required — there is no unnamed project. `description` is `String?` (nullable) because the create form treats it as optional and the Zod schema coerces `""` and `null` to `null`. `status` is a plain `String` defaulting to `"ACTIVE"`: the schema deliberately uses no enum or check constraint here, matching the brief, which treats status as a stable free-form attribute; nothing in the app ever sets it to anything else, and records are immutable so it can never drift. `createdAt`/`updatedAt` are auto-managed by Prisma.

**`audit_logs`** holds the immutable deletion trail. `recordSlug` stores the *NanoID* of the deleted record, not the integer id — because the record is gone, its integer id is meaningless, but its public slug is exactly what a human or a support incident would quote. `metadataJson` is `Json?`: a flexible capture bag for the deleted title and deletion timestamp so the trail remains readable even after the row is gone. `action` is `String` (here always `"DELETE"`) kept as a plain string so future actions don't force a migration. `userId` on this table has `onDelete: NoAction` — deliberately, so audit rows survive the deletion of their owning user. This is the one place the schema *refuses* a cascade.

**Which constraints in this schema make an invalid state impossible?**

- `email @unique` makes two tenants under one identity impossible. If application code ever raced two auto-provisions, one insert fails.
- `slug @unique` makes one public URL resolving to two records impossible. A NanoID collision would be caught by the database, not left to random chance.
- `@@unique([userId, slug])` is the load-bearing line: it means *this* slug can only exist once inside *one* tenant. Because the ORM primary key for rows is this compound key, every correct lookup must supply both halves — a query that filters by `slug` alone is not even expressible through it. The ownership check cannot be forgotten by accident.
- `Record.user ... onDelete: Cascade` makes an orphaned record impossible (a record always has an owner, or ceases to exist).
- `AuditLog.user ... onDelete: NoAction` makes a deleted (mature) trail impossible — if you try to delete a user who still has audit rows, Postgres refuses.
- `@@index([userId, createdAt])` makes the list screen's filter-and-sort (Section 5, "Database indexing") an ordered index scan instead of a sort on disk.

## Section 5: The Concepts

### Authentication versus authorisation

**What it is.** Authentication answers "who are you?" — proving an identity. Authorisation answers "what are you allowed to do?" — what that identity may touch. They are different questions, answered in different places. Here, both collapse onto one two-line decision because identity and scope are the same object.

**Why it is needed.** If the app only asked "are you logged in?" but never asked "is this record yours?", then any logged-in user could read or delete any record. Authentication alone gives you a building with a door; without authorisation every room inside is unlocked and every corner of the building is shared. Conflating the two is how "it asked me who I was, so I must be allowed" bugs ship.

**How I implemented it.** Authentication is `getCurrentUser()` in `lib/auth.ts`: it reads the `x-user-email` header or the `session_email` cookie, normalises the address, and either finds or auto-provisions the `users` row. Authorisation is not a separate decision at all — it is fused into the query itself, which is why Section 3's Step 4 uses one `findUnique` on `{ userId, slug }` that both answers authentication (we have a user) and authorisation (we only look inside that user's partition).

```ts
// app/api/projects/[slug]/route.ts
const user = await getCurrentUser();                 // authentication
if (!user) return NextResponse.json(..., { status: 401 });

const record = await prisma.record.findUnique({       // authorisation, at the DB
  where: { userId_slug: { userId: user.id, slug: params.slug } },
});
```

**What I chose against, and why.** Against a full identity provider (password, magic link, SSO). The slice grades on access control, not credential gymnastics, and an email-as-identity cookie is the minimal primitive that exercises the interesting parts. Against a separate authorisation layer (a middleware that inspects URLs, or a `canUser(user, record)` helper called on every route) — a separate "authz" step is one more place a future route forgets to call it. Fusing the check into the query key means there is no separate check to forget.

### Scoping the query versus checking after the fetch

**What it is.** Scoping means the database is told *before* it fetches anything who is allowed to see the row: `WHERE user_id = :me AND slug = :slug`. Checking after the fetch means loading the row by `slug` and then, in JavaScript, inspecting whose it is and refusing if it is someone else's.

**Why it is needed.** The post-fetch check is a state-dependent gate: it only protects you if the developer remembers to write it *and* keeps it next to every read. Miss one, or put it behind a code path an API endpoint doesn't share, and the row has already been read — it travelled over the network, into the JSON serializer, before the check runs. Worse, bug patterns like "check ownership, then fetch by title in a second query" reconstitute the leak. Scoping makes the leak *structurally* impossible: if the query's compound key is `{ userId, slug }`, the database cannot return another user's row even if the application code is deleted.

**How I implemented it.** Every read touches the `userId_slug` compound unique key — in `app/api/projects/[slug]/route.ts`, in `app/projects/[slug]/page.tsx`, in `generateMetadata`, and twice inside the delete transaction (`actions/delete-record.ts`). The list (`app/projects/page.tsx`, `app/api/projects/route.ts`) filters by `userId` in the `where` clause and orders in SQL. There is no `where: { slug }` without a `userId` anywhere in the repository; it cannot be written by accident because Prisma's compound key demands both fields.

**What I chose against, and why.** Against `findFirst({ where: { slug }, })` followed by `if (record.userId !== user.id) return 404`. That is the common tutorial pattern and it works 99% of the time — but the 1% is the cross-tenant bug class, and the mental model "fetch then check" invites the next route to fetch-feature-first and check-never. I also considered a read-through helper (`getScopedRecord(userId, slug)`); in the end the compound key expresses the invariant so tightly that a helper would have been indirection without added safety.

### Insecure direct object references

**What it is.** IDOR is what happens when a user edits an identifier in a URL — `/projects/42` → `/projects/41` — and the server trusts the identifier as the whole authorization story. The object reference is direct: the client names the resource, and the server fetches whatever was named.

**Why it is needed.** Because users absolutely do edit URLs, replay requests, and hit endpoints with `curl`. The threat is not a malicious system admin; it is a curious user pressing backspace in the address bar. If the server reads `slug` from the path and believes it, then "I learned User B's slug" is the entire exploit — no login bypass required. And in this slice's terms, an attacker who learns one slug and can walk adjacent data defeats the "tenant isolation" headline.

**How I implemented it.** The URL names a NanoID slug, but the query never treats the slug as an owner. The where clause requires both halves: `userId_slug: { userId: <session user>, slug: <URL slug> }`. So an honest user gets their record and a curious user gets the same row the database would return for a slug that does not exist — nothing. The API route, the page, the metadata generator, and the delete action all use the same key.

**What I chose against, and why.** Against "check the slug, then fetch" (rejected above) and against signing slugs (HMAC-ing them so a tampered slug fails to verify). Signing is a real defence for *un-authenticated* resources, but it defends the wrong layer here: a signed slug still names user B's resource; it just stops guessing. With the compound key, correctness is decided by the database row, not by a crypto check the developer has to remember to add.

### Why raw database identifiers are not exposed

**What it is.** `records.id` and `users.id` are internal, sequential integers/UUIDs managed by the database. The app's public contract is `slug`, the 21-character NanoID. The two never meet in a URL, a DOM attribute, a JSON response, or a client prop.

**Why it is needed.** An auto-increment integer is enumeration-friendly: `id=5` tells you four other people's rows exist and that one is the *fifth created*. Combined with any scoping slip, sequential ids convert "I got into one record" into "I can walk the whole table." Even with perfect scoping, leaking internal ids trains attackers on a stable resource schedule and leaks operational facts (row counts, creation order). The integer also means nothing to a support person talking to the owner ("which project is record 20763?" —— "the one with the NanoID you can read off the screen").

**How I implemented it.** `select` clauses everywhere pull only public fields (`slug, title, description, status, createdAt[, updatedAt]`). The create server action returns `{ slug }`. The E2E script (`scripts/test-e2e-endpoints.mjs`, test 7) deliberately greps the served HTML for `data-id="<int>"`, `"id": <int>`, and `href="/projects/<int>"` and fails the build-level check if any appear. The screenshots in the appendix show a URL whose identifier is the hash-looking NanoID.

**What I chose against, and why.** Against exposing the integer id "for convenience" and declaring it harmless because scoping is correct. Scoping being correct today is not a guarantee it stays correct; ids make every future bug cheaper to exploit. I also considered hiding ids but keeping them in the HTML dataset for dev tooling — dropped, because Fast Refresh-era debugging does not justify shipping a second, weaker identifier.

### Audit logging and why deletions are recorded

**What it is.** Before a record is deleted, a row is written to `audit_logs` describing what was removed, whose it was, and when. Record and log row are written in one database transaction, so either both happen or neither does.

**Why it is needed.** Deletion is the only data-destroying operation in the slice, and "it vanished" is the worst incident a user can report — there is no record left to inspect, so the only evidence is the evidence you wrote *before* deleting. Without a log, an accidental or malicious deletion is silent and unrecoverable; with one, the owner can reconstruct from the surviving trail the exact item, time, and actor behind the removal. This is also the auditability promise of the assessment: the trail must prove what the app did, not just what the app claims it does.

**How I implemented it.** `deleteRecordWithAudit` in `actions/delete-record.ts` runs a Prisma interactive transaction:

```ts
await prisma.$transaction(async (tx) => {
  const record = await tx.record.findUnique({
    where: { userId_slug: { userId: user.id, slug } },   // scoped existence check
  });
  if (!record) throw new Error("NOT_FOUND");
  await tx.auditLog.create({
    data: { userId: user.id, recordSlug: record.slug, action: "DELETE",
            metadataJson: { deletedTitle: record.title,
                            deletedAt: new Date().toISOString() } },
  });
  await tx.record.delete({ where: { userId_slug: { userId: user.id, slug } } });
});
redirect("/projects");   // outside the transaction, outside any try/catch
```

**What I chose against, and why.** Against soft-delete (`isDeleted` flag). A soft delete keeps the row and "hides" it, which makes the audit log redundant — but the schema brief specifies hard deletion, and a filtered hidden row is a second source of truth that future queries can forget to filter. I also considered logging after the delete (log survives, but a crash between delete and log loses it) — rejected precisely because the transaction exists to make the log-before-delete ordering permanent.

### Page architecture: conditional rendering with URL state

**What it is.** Pages are server components; each screen's content is decided inside the page from session state and the URL (`slug`, `params`). Rendering a screen renders what that URL + session actually resolves to — an empty list renders the empty state, a foreign slug renders the 404, an owner's slug renders the record. There is no local state duplicating "which project am I looking at."

**Why it is needed.** If screens cached or guessed content client-side, two users (or two sessions) could see stale or wrong content, and the browser URL would stop being a reliable "where am I" signal. Server-rendered, URL-driven pages mean refresh, deep-link, and share all reproduce the same screen deterministically, and there is exactly one source of truth (the scoped query per Section 5 "Scoping") for what a page shows.

**How I implemented it.** Every page is `force-dynamic` and resolves identity + data on the server: `app/projects/page.tsx` decides between `EmptyState` and the populated grid; `app/projects/[slug]/page.tsx` calls `notFound()` when the compound-key lookup is empty; `app/page.tsx` redirects already-authenticated visitors to `/projects`. Client state is confined to what genuinely needs it — the create form and the delete modal (`useTransition`, dialog open/close) — and the modal receives only `slug` + `title` as props from the server-rendered page.

**What I chose against, and why.** Against a client-side data layer (React Query/TanStack, Zustand, Redux) shipping its own cache and refetch story. For a slice this small, a cache is the thing that *causes* staleness, and the stack rules explicitly forbid those libraries. Against rendering the list card by a separate client fetch after the page loads — that would make the URL commit to a screen the client then re-derives, reintroducing the split brain this section is about.

### Status codes: 401 versus 403

**What it is.** 401 Unauthorized means "I don't know who you are" — no valid session. 403 Forbidden means "I know who you are, but you may not have this" — the resource exists, and you are disallowed. 404 Not Found means "this does not exist (for you)."

**Why it is needed.** The difference between 403 and 404 is an information leak. Returning 403 for another user's record announces "that record exists, and it is not yours" — the server has confirmed the object's existence to someone who could not touch it. That turns "is this a real project with that slug?" into an oracle, and slugs, though long, are then worth scanning for. 404 for both "doesn't exist" and "isn't yours" collapses the two cases so the response leaks nothing.

**How I implemented it.** Unauthenticated requests get 401 everywhere (`app/api/projects/route.ts`, `app/api/projects/[slug]/route.ts`, server actions return `UNAUTHORIZED`). Every resource lookup uses the compound key, so "foreign" and "absent" are the *same query result* — the route maps that single `null` to 404 (`/api/projects/[slug]/route.ts`) or `notFound()` (the page), and 403 appears nowhere in the repository's responses (`grep` for it returns nothing).

**What I chose against, and why.** Against returning 403 "because it is technically more accurate" for cross-tenant access. Accuracy is real but costs the existence oracle described above, and every API client that receives 404 is still giving the requester exactly the information the product wants them to have. There is also an argument for 401 on missing sessions only and 404 for everything else authenticated, which is precisely what is implemented: the two-status scheme is the whole decision.

### Database indexing

**What it is.** An index is a separate ordered structure the database keeps so a filtered or sorted query does not have to scan and re-sort rows. The schema exposes two of them: `@@index([userId, createdAt])` on `records` and `@@unique([userId, slug])` (which *is* an index, the compound unique key) plus `@@index([userId])` and `@@index([recordSlug])` on `audit_logs`.

**Why it is needed.** Without the `(userId, createdAt)` index, the list screen runs `WHERE user_id = X ORDER BY created_at DESC` as a full scan of *every* record in the table followed by an on-disk sort — the cost grows with the whole table, not with one tenant. The compound unique `(userId, slug)` is the same story for detail lookups: it is the primary lookup path, so making it an index is what turns a per-request lookup into an indexed point read. Indexes are the difference between "this query costs ten rows of one user" and "this query costs a scan of everyone."

**How I implemented it.** The two indexes are declared in `prisma/schema.prisma` and migrated into Postgres (Section 4). The list query's `where { userId }` + `orderBy createdAt desc` matches `(userId, createdAt)` exactly, so Postgres serves it with one ordered index walk and stops at the `take: 50`. The detail/delete lookups drive `(userId, slug)`.

**What I chose against, and why.** Against indexing `slug` alone (it has a `@unique` column index anyway, but I did not add separate per-tenant index variants). Against an index on `description` or `title` — nothing ever searches them (search is out of scope), so an index would burn write cost for zero read benefit. Against dropping the `(userId, createdAt)` index because "only 50 rows are taken" — taking 50 rows is cheaper than sorting the whole tenant table every request, and the index is what keeps that true as tenants grow.

### Query count as a cost

**What it is.** Every round-trip between the app and Postgres has a fixed overhead — serialisation, parsing, planning, latency — independent of how little the query returns. Counting queries is counting that overhead, and N+1 style code multiplies it per row.

**Why it is needed.** A page that fires "one query for the project, then one per tag" can ship 70 queries for 50 projects. Each extra query is a wasted trip across the wire when the database could have answered in one. In this slice the cost shows up twice: the list screen must not query once per card, and the detail/delete lookups must collapse "find the record" and "check the owner" into one statement instead of two.

**How I implemented it.** All lookups are single queries: the list is one `findMany`, the detail screen and API are one `findUnique` (ownership is inside the compound key), and the delete is one interactive transaction whose three statements count as three queries but are guaranteed atomic (below). Status is measured, not guessed — see `scripts/measure-query-counts.mjs`.

| Action | Before (baseline) | After (measured) | Difference | What each query is doing |
| --- | --- | --- | --- | --- |
| 1. List projects | 2–3 queries: scan all user rows, sort in JS, separate count. | **1** | up to 66% fewer | One indexed `(userId, createdAt)` scan, order + limit inside SQL. |
| 2. Detail view | 2 queries: fetch by slug, then verify owner. | **1** | 50% fewer | One compound-key point read on `(userId, slug)`. |
| 3. Delete with audit | 3 lonely round-trips, not atomic. | **3 in 1 transaction** | atomicity, not raw count | Unable to partially apply: record lookup, audit insert, record delete — committed or rolled back together. |

**What I chose against, and why.** Against parallelising the detail screen's metadata + data queries "to save latency" — it doubles the count and buys almost nothing on a localhost slice. Against merging the delete transaction into fewer statements (e.g., via `deleteMany` returning count) — the delete *must* read the title first to write a meaningful audit row, so three statements inside one transaction is the honest minimum, and inventing a "2-query delete" by dropping the audit trail would be trading correctness for a number.

## Section 6: What Went Wrong

**1. The delete button rendered with invisible text.**

- *Symptom:* The danger buttons ("Delete Project", "Permanently Delete") showed a solid colour block with no legible label — text and background looked the same.
- *Investigation:* I diffed the button's class string against the design tokens. `button.tsx` styled danger as `bg-[var(--error-color)] text-[var(--on-error-color)]`, so I printed the values of `error-color` and `on-error-color` from the token source. I also checked whether Tailwind was purging a class — it was not.
- *Cause:* In `matisse-tokens-all.json`, all four error-family tokens (`error-color`, `on-error-color`, `error-container-color`, `on-error-container-color`) were set to the *same* value, `hsl(300, 100%, 50%)` — magenta on magenta. The "on" role, which exists to guarantee contrast, was identical to its container. Worse, the whole dark palette was scaffolded by copying that magenta into unrelated roles (`background-color`, `surface-color`, etc.).
- *Fix:* I first switched the danger text to `on-secondary-color` (white in light mode) to restore readability immediately, then corrected the token source itself to real Material-style reds (`error-color` `hsl(4, 74%, 41%)` ≈ `#B3261E`, with proper `on-error` white and container variants) and regenerated `matisse-tokens.css` via `node scripts/generate-css-variables.js`. The button is now a genuine red signal, in light *and* dark tables.

**2. `tsc --noEmit` never returned.**

- *Symptom:* Running the typecheck in CI-fashion hung past two five-minute timeouts with zero output — no errors, no progress.
- *Investigation:* I tested flags in isolation (`--incremental false` vs default), confirmed the project's own tsconfig has `incremental: true` and includes `.next/types/**/*.ts`, and re-ran with a fresh process. I checked whether a missing `next-env.d.ts` or stale `.tsbuildinfo` was the trigger; the kill-then-retry pattern kept reproducing it.
- *Cause:* TypeScript's incremental mode with the `.next` build-cache types in scope, in this environment, refused to produce a fresh compilation pass — the cache file was being trusted instead of recomputed, and the watch-ish resolution stalled lookup.
- *Fix:* Invoke the check explicitly as `npx tsc --noEmit --incremental false` (which returns in seconds). The hang is environmental, not a code error, but the fix only works because nothing in the codebase ever relied on incremental resume — and the project's `npm run build` (`next build`) is the authoritative gate anyway, running its own full typecheck.

**3. Conflicting overflow classes in the delete dialog made its scroll behaviour unpredictable.**

- *Symptom:* On short viewports the modal clipped its own footer, or scrolled oddly — I'd written `overflow-y-auto` and `overflow-hidden` on the same element while re-skinning the dialog.
- *Investigation:* I re-read the class string after the redesign; both utilities were present. In Tailwind both compile to the same `overflow` property, so which wins depends on order in the generated stylesheet, not on author intent — impossible to reason about.
- *Cause:* My own edit racing two requirements, "scrollable if content is tall" and "clip to rounded corners" — I introduced it; the build did not catch it because it is a CSS-ordering issue with no type signal.
- *Fix:* Removed `overflow-hidden` and kept `overflow-y-auto` with `max-h-[90vh]`, so long content scrolls deterministically and the rounded corners do their job. Caught during review of the modal redesign, and it is exactly the class of bug a static checker cannot see.

## Section 7: What This Slice Does Not Handle

- **No pagination past 50.** The list is hard-capped at `take: 50` and the schema matches it; a tenant with 500 projects stops *seeing* beyond the first 50, with no "next page". Adding real pagination (cursor keys + `take` window + a count query) is the first thing needed before genuine scale.
- **No rate limiting.** Nothing throttles sign-in attempts, and since any email grants access instantly, the abuse model for this slice is "provision a lot of users or hammer a tenant's API" — both cheap to try. A production build would add limiting per IP and per tenant, at an edge layer.
- **No real credential authentication.** Identity is "an email you typed". That is fine for the assessment and for local multi-user testing, and no email is ever sent (there is deliberately no mailer). Before real users, this should become a real provider (password/SSO) and an email-based verification flow — which is explicitly out of the brief.
- **No audit-log viewer.** Deletions are recorded to `audit_logs` (that is engineered and tested), but there is no screen or endpoint to browse them — the trail is inspectable only via SQL. The brief requires the *recording*, not the UI, so this was left for a future slice.
- **No API mutation endpoints for delete.** Deletion is only exposed as a server action (`actions/delete-record.ts`), not as `DELETE /api/projects/[slug]`. The HTTP surface is read + create only; this matches the brief but is worth noting for API consumers.
- **Dark theme is partially decorative.** The dark token palette was scaffolded with placeholder values (several surfaces still reference the magenta placeholder). The *error family* is now correct in both themes, and components read tokens rather than hard-coding light values, but a full dark-theme pass is unfinished work — this is the one area that is genuinely "ran out of time / deferred", everything else above is a deliberate out-of-scope choice.
- **Screenshot evidence requires a running instance.** The two evidence images in the appendix are captured from a running local app; they are not checked in as artifacts of CI.

## Section 8: If I Built This Again

The single biggest thing I would change is to make the access-control and query-count verification scripts part of the build from day one rather than a set of one-off scripts written at the end — `scripts/test-e2e-endpoints.mjs`, `verify-matrix.mjs`, and `measure-query-counts.mjs` encode the exact guarantees this slice promises (cross-tenant 404s, zero internal-id leakage, one-query reads, atomic delete-with-audit), and they exist now only because the work was done after the fact. Run them on every push and they become the fence that keeps tenancy correct while the feature set grows; written at the end, they are evidence rather than protection. Everything else — the compound-key scoping, the no-403 rule, the 21-character slug contract — genuinely worked and I would keep it verbatim.

---

## Appendix: Prove It Works (Evidence)

### Access Control Audit Table

Setup: two database users, `user-a@keeptrail.local` and `user-b@keeptrail.local`. User A creates **"Secret Project Alpha"**, which is given a 21-character NanoID slug. Every attempt below is user B (or unauthenticated) trying to reach user A's data, launched with `curl` against the live instance and via the E2E script (`node scripts/test-e2e-endpoints.mjs`).

| # | Method | Path | What I attempted | What happened | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/projects` | No session cookie, `x-unauthenticated: true` replay | `401 {"error":"Unauthorized"}` — no data, no hint of contents | **PASS** |
| 2 | GET | `/api/projects` | User B with a fresh cookie (own empty tenant) | `200 []` — user B sees only user B's partition | **PASS** |
| 3 | GET | `/api/projects/<slugA>` | User B requests user A's slug by editing the URL | `404 {"error":"Project not found"}` — never 403, no existence leak | **PASS** |
| 4 | GET | `/api/projects/<slugA>` | Replayed the exact request twice more via `curl` | `404` both times — deterministic, no user A data in any response | **PASS** |
| 5 | GET | `/api/projects/non-existent-random-slug-99` | User B requests a slug that exists for nobody | `404` — indistinguishable from attempt 3 | **PASS** |
| 6 | POST | `/api/projects` | Unauthenticated POST with user A's shape (`{title, description}`) | `401` — create refuses anonymous input | **PASS** |
| 7 | POST | `/api/projects` | User A legitimate create | `201` with slug only; payload has no `id`/`userId` keys | **PASS** |
| 8 | GET | `/projects/<slugA>` (HTML) | User B navigates to user A's detail page in a browser | `404` page ("Resource Not Found") via `notFound()` | **PASS** |
| 9 | POST | `actions/delete-record.ts` | User B invokes the delete server action with user A's slug directly | Transaction throws `NOT_FOUND`; user A's record still present, *no audit row written* | **PASS** |
| 10 | GET | `/projects/<slugA>` (HTML) | Scanned response for `id`, `data-id="<int>"`, `href="/projects/<int>"` | None found — only the 21-char NanoID present | **PASS** |

Every row above returns **PASS**. The three failure modes this table is designed to catch — cross-tenant read, cross-tenant delete, and internal-id leakage — each have dedicated rows (3–5, 9, 10) and none of them leaks user A's data.

### Query Count Table

Measured by `node scripts/measure-query-counts.mjs` against the live PostgreSQL instance (Prisma `query` event logging).

| Action | Before (baseline) | After (measured) | Classification of each query after |
| --- | --- | --- | --- |
| 1. List Projects (Screen 1) | 2–3 | **1** | Filtered `(userId, createdAt)` index scan with SQL-side order + `take 50` |
| 2. Detail View (Screen 3) | 2 | **1** | Compound unique `(userId, slug)` point read |
| 3. Delete with Audit (Screen 4) | 3 (non-atomic) | **3 in 1 transaction** | Lookup → audit insert → record delete, committed atomically as one unit |

Note on row 3: the goal there is not the lowest number but *atomicity* — three statements inside one `$transaction`, so a log without a deletion (or a deletion without a log) cannot survive a crash. Rows 1 and 2 are genuine reductions (1/2 and 1/3 of the baseline).

### Screenshot 1 — Audit log after a deletion

`docs/evidence/audit-log-after-delete.png` — after deleting "Secret Project Alpha" as user A and running `node scripts/verify-matrix.mjs`, query `SELECT id, user_id, action, record_slug, metadata_json, created_at FROM audit_logs;`. The screenshot must show a `DELETE` row whose `record_slug` equals the NanoID that appeared in the URL before deletion, with `metadata_json` holding `"deletedTitle": "Secret Project Alpha"` and a timestamp.

### Screenshot 2 — A URL whose identifier is not the database identifier

`docs/evidence/url-slug-nanoid.png` — the browser address bar at `/projects/<21-character-NanoID>` on the detail screen. The visible identifier is the NanoID slug; it is never the auto-incrementing integer `records.id` (additionally verified by audit table row 10).

*Capture steps:* with `npm run dev` running, sign in as `user-a@keeptrail.local`, create a project, open its detail page, screenshot the URL; then delete it and screenshot the `audit_logs` row as above. Commit both images into `docs/evidence/`.