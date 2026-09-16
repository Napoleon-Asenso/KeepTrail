---
trigger: always_on
---

# Git Commit Conventions

## 1. Commit Message Format

Use conventional commits throughout the repository:

```text
<type>(<optional scope>): <description>
```

Valid types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`.

Recommended scopes for this slice: `records`, `auth`, `prisma`, `actions`, `ui`, `design-tokens`, `docs`.

## 2. Rules

- Write descriptions in imperative mood: "add delete confirmation modal", not "added..." or "adds...".
- Keep the first line under 72 characters; no trailing period.
- One logical change per commit. Stage only intended files.
- NEVER commit secrets, `.env`, `node_modules`, or build output.
- NEVER skip hooks or force-push to shared branches.

## 3. Examples

```text
feat(records): add create project form with zod validation
fix(ui): disable delete button while request is pending
refactor(actions): scope delete query with userId_slug
docs: update PRD summary in AGENTS.md
```

## 4. Pre-Commit Checklist

1. Review `git status` and `git diff`.
2. Confirm no `.env` or secrets are staged.
3. Match existing repo style (`git log --oneline -10`).
4. If a hook rejects the commit, fix the cause and create a new commit — do not amend the rejected one.