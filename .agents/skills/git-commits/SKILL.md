---
name: git-commits
description: Use when committing, amending, or writing commit messages for KeepTrail. Enforces conventional commit format, scoping to the slice, and the project's commit conventions.
---

# Git Commit Conventions

## Format

Follow the conventional commit spec:

```
<type>(<scope>): <description>
```

Valid types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`.

Scope for this slice: `records`, `auth`, `design-tokens`, `ui`, `prisma`, `actions`, or `docs`. Use the smallest relevant scope — do not invent scopes outside these.

## Rules

- Imperative mood, no trailing period: `feat(records): create record detail page`.
- The diff must be coherent; stage only intended files.
- NEVER commit secrets, `.env`, or `node_modules`.
- Never skip hooks or force-push.
- Keep messages under ~72 chars; one logical change per commit.

## Checklist before committing

1. `git status` / `git diff` reviewed.
2. No `.env` or secrets staged.
3. Commit matches repo style (check `git log --oneline -10`).
4. Commit only staged, intended files.

If a commit is rejected by a hook, fix the cause and create a new commit — do not amend the failed one.