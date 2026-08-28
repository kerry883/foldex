# Foldex — Backend

REST API for foldex. Built with Hono, Drizzle ORM, and PostgreSQL. Desktop is local-first; this server handles Better Auth and video generation only. Types are consumed by the desktop app via Hono RPC (`hono/client`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| HTTP framework | Hono |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Auth | Better Auth (OTP / passwordless) |
| Queue | BullMQ + Redis (Render Key Value, `noeviction`) |
| Email | Resend |
| Video Renderer | Python, Flask, Manim (private service) |
| Deployment | Render Blueprint at repo-root `render.yaml` |

---

## API Overview

| Prefix | Description |
|---|---|
| `GET /` | Health check |
| `POST,GET /api/auth/*` | Better Auth — OTP send, verify, session, sign out |
| `GET /api/videos` | Public ready videos |
| `GET /api/videos/my` | Authenticated user's videos (`?folderId=`) |
| `POST /api/videos/generate` | Queue a render (desktop supplies Manim code) |
| `POST /api/videos/:id/retry` | Retry a failed video with fixed code |
| `PUT /api/videos/:id` | Update folder / public flag |
| `DELETE /api/videos/:id` | Delete or unpublish video |
| `POST /api/videos/:id/feedback` | Submit like/dislike |
| `GET /api/videos/:id/feedback` | Get current user's vote |
| `GET /api/videos/:id/getstatus` | Poll generation status |
| `GET /api/videos/:id` | Get video |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) — for local PostgreSQL and Redis
- A [Resend](https://resend.com) account for OTP emails

### 1. Install from the monorepo root

```bash
bun install
```

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d
```

This starts PostgreSQL 16 and Redis 7 (`--maxmemory-policy noeviction`) from `docker-compose.yml`.

### 3. Configure environment

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/foldex
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_your_key_here
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
MANIM_FLASK_URL=http://localhost:5001
```

Leave `COOKIE_DOMAIN` unset locally and on `*.onrender.com`. Set it to `.foldex.space` only when that custom domain is attached.

To generate `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Apply database migrations

```bash
bun run db:migrate
```

The API and worker also run pending Drizzle migrations on boot.

### 5. Run the API and worker

```bash
# API (hot reload)
bun dev

# BullMQ worker (separate process — required for Render parity)
bun run worker
```

Server runs at `http://localhost:3000`.

---

## Project Structure

```
src/
  db/schema.ts              # Better Auth tables + videos + video_feedback
  lib/
    auth.ts                 # Better Auth + OTP email
    db.ts                   # pg Pool (SSL on Render) + Drizzle
    queue.ts                # BullMQ Queue only (API producer)
    redis.ts                # ioredis (maxRetriesPerRequest: null)
    video-schema.ts         # Zod bodies for Hono RPC
    migrate.ts              # drizzle-orm migrator
  middleware/requireauth.ts
  controllers/videocontroller.ts
  routes/videoroute.ts
  app.ts                    # Hono app + AppType (imported by desktop)
  index.ts                  # Bun HTTP entry
  worker.ts                 # BullMQ Worker entry (do not import from the API)
```

---

## Database Schema

Better Auth: `user`, `session`, `account`, `verification`.

App: `videos`, `video_feedback`. Notes, folders, chats, templates, and API keys live in the desktop SQLite database.

---

## Deployment

Production is a Render Blueprint (`render.yaml` at the repo root):

| Service | Role |
|---|---|
| `foldex-web` | Landing site (TanStack Start SSR) |
| `foldex-api` | Hono API |
| `foldex-worker` | BullMQ consumer (same image, `bun run src/worker.ts`) |
| `foldex-renderer` | Private Manim/Flask service |
| `foldex-db` | Postgres |
| `foldex-kv` | Redis-compatible Key Value, `noeviction` |

```bash
# Build the API image locally (from repo root)
docker build -f apps/backend/Dockerfile -t foldex-api .
```

---

## License

[MIT](./LICENSE)
