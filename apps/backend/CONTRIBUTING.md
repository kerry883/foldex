# Contributing to foldex

Thanks for wanting to contribute. This document covers everything you need to get from zero to a merged pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Branch Workflow](#branch-workflow)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Style Guide](#style-guide)

---

## Code of Conduct

Be respectful. We're a small open-source project started as a school project — everyone here is learning. Constructive feedback only. Dismissive or hostile comments will get you removed.

---

## How to Contribute

There are several ways to help:

- **Fix a bug** — check the [bug label](../../issues?q=label%3Abug) on the issue tracker
- **Build a feature** — check [good first issue](../../issues?q=label%3A%22good+first+issue%22) if you're new
- **Improve docs** — README, inline comments, or the wiki
- **Report problems** — use the bug report template
- **Request features** — use the feature request template

If you plan to work on something significant, open an issue first so we can discuss the approach before you spend time on it.

---

## Development Setup

### Frontend (foldex-frontend)

1. Fork the repo and clone your fork
2. Install dependencies:
   ```bash
   bun install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in `NEXT_PUBLIC_API_URL` pointing at your local backend
5. Start the dev server:
   ```bash
   bun dev
   ```

For the desktop app you also need [Rust](https://rustup.rs) installed, then:
```bash
bunx tauri dev
```

### Backend (foldex-backend)

1. Fork and clone
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
4. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
5. Push the database schema:
   ```bash
   bunx drizzle-kit push
   ```
6. Run the server:
   ```bash
   bun dev
   ```

---

## Branch Workflow

```
main           ← production, always stable
  └── feat/your-feature-name
  └── fix/short-description-of-bug
  └── docs/what-you-updated
  └── chore/what-you-changed
```

- Branch off `main`
- Keep branches focused on one thing
- Delete your branch after it is merged

**Naming examples:**
```
feat/whiteboard-block
fix/folder-delete-cascade
docs/update-api-overview
chore/upgrade-drizzle
```

---

## Commit Messages

We follow a lightweight version of [Conventional Commits](https://www.conventionalcommits.org).

```
<type>: <short description>

[optional body — explain why, not what]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behaviour change |
| `chore` | Build, deps, tooling |
| `test` | Adding or fixing tests |

**Examples:**
```
feat: add mermaid diagram block to editor
fix: folder delete now cascades to child notes
docs: add offline sync section to README
chore: upgrade drizzle-orm to 0.32
```

Keep the first line under 72 characters. Use the body to explain *why* if the change is non-obvious.

---

## Pull Request Process

1. Make sure `main` is up to date before you start:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Run the build locally before opening a PR:
   ```bash
   # Frontend
   bun run build

   # Backend
   bun run build
   ```

3. Fill in the PR template completely:
   - What changed and why
   - Before/after screenshots for any UI changes
   - A short video for animation or interaction changes

4. Keep PRs small and focused. A PR that changes one thing is easier to review and merge than one that changes five.

5. If your PR is a work in progress, open it as a **Draft** and mark it ready when it is done.

6. A maintainer will review within a few days. Address feedback by pushing new commits — do not force-push after review has started.

7. We squash-merge PRs to keep the commit history clean.

---

## Reporting Bugs

Use the **Bug Report** issue template. Include:

- Steps to reproduce (minimal and deterministic)
- What you expected to happen
- What actually happened
- Your environment (OS, browser or desktop app version, Node/Bun version)
- Relevant logs or screenshots

Vague reports like "it doesn't work" will be closed without action.

---

## Requesting Features

Use the **Feature Request** issue template. Include:

- The concrete problem you are trying to solve
- Your proposed solution
- The smallest useful version of the feature
- Any alternatives you considered

Feature requests that clearly explain the problem are much more likely to be picked up.

---

## Style Guide

### TypeScript

- Strict mode is on — no `any` unless genuinely unavoidable (add a comment explaining why)
- Prefer `type` over `interface` for object shapes
- Name files in `kebab-case`, components in `PascalCase`
- Export one primary thing per file

### Next.js

- All client components must have `"use client"` at the top
- Keep components focused — if a component is doing too much, split it
- Use TanStack Query for all server state — no `useEffect` + `fetch` patterns
- Use Zustand only for local UI state that does not need to be cached or synced

### Backend

- Every route that writes data must check that the resource belongs to the authenticated user
- Always include `userId` in the `where` clause of write operations — not just the existence check
- Return consistent error shapes: `{ error: string }` with the appropriate HTTP status code
- Use `c.req.valid("json")` instead of `c.req.json()` on routes that have a Zod validator

### Video Renderer (Manim Flask Server)

foldex uses a separate Python microservice to render the AI-generated Manim animations into `.mp4` files. If you are working on the video generation feature, you must run this locally.

1. Ensure you have Python 3.12 and `ffmpeg` installed on your system.
2. Clone the renderer repository [foldex-manim-renderer](https://github.com/Pirate193/foldex-manim-renderer.git).
3. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

### CSS / Tailwind

- Use `cn()` for conditional class merging
- Avoid inline styles except for CSS custom properties
- Don't hardcode colours — use the theme tokens (`text-foreground`, `bg-background`, etc.)

---

## Questions

If you are unsure about something, open a [Discussion](../../discussions) or ask in the issue you are working on. We would rather answer a question than review a PR that went in the wrong direction.