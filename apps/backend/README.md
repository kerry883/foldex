# Foldex — Backend

> Personalized Self-Learning Management Platform — API server.

![Hono](https://img.shields.io/badge/Hono-4-orange?logo=hono)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green)

REST API and AI streaming backend for foldex. Built with Hono, Drizzle ORM, and PostgreSQL. Handles authentication, note/folder/template/video CRUD and AI chat streaming with tool calls .

**Frontend repo → [foldex-frontend](https://github.com/Pirate193/foldex-frontend)**
**ManimRenderer repo->[foldex-manim-renderer](https://github.com/Pirate193/foldex-manim-renderer.git)**

---

## Tech Stack

| Layer | Technology |
|---|---|
| HTTP framework | Hono |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Auth | Better Auth (OTP / passwordless) |
| AI | Vercel AI SDK (OpenAI, Anthropic, Google, DeepSeek, xAI, Moonshot) |
| Email | Resend |
| Video Renderer | Python, Flask, Manim (Runs as a separate microservice) see manim-renderer repo |
| Deployment | Dokploy (Docker) |

---

## API Overview

| Prefix | Description |
|---|---|
| `POST /api/auth/*` | Better Auth — OTP send, verify, sign out |
| `GET /api/notes` | List notes (supports `?folderId=`, `?search=`) |
| `POST /api/notes` | Create note |
| `GET /api/notes/:id` | Get full note with content |
| `PUT /api/notes/:id` | Update note |
| `DELETE /api/notes/:id` | Delete note |
| `POST /api/notes/:id/move` | Move note to folder |
| `GET /api/folders` | Get folders |
| `GET /api/folders/:id` | Get folder|
| `POST /api/folders` | Create folder |
| `PUT /api/folders/:id` | Update folder |
| `DELETE /api/folders/:id` | Delete folder |
| `GET /api/templates` | All templates (own + public) |
| `GET /api/templates/my` | Own templates only |
| `GET /api/templates/community` | Public templates |
| `POST /api/templates/from-note/:noteId` | Save note as template |
| `POST /api/templates/:id/apply` | Create note from template |
| `GET /api/chat` | List chats |
| `POST /api/chat` | Create chat |
| `GET /api/chat/:id` | Get chat messages |
| `PUT /api/chat/:id` | Rename chat |
| `DELETE /api/chat/:id` | Delete chat |
| `POST /api/chat/:id/messages` | Add message |
| `POST /api/ai/chat/:chatId` | Stream AI response (SSE) |
| `GET /api/videos` | Get public videos|
| `GET /api/videos/my`|Get Users videos|
| `POST /api/videos/generate`| Generate  video used by desktop|
| `POST /api/videos/generate-from-prompt`|Generate  video from prompt used by web |
| `POST /api/videos/:id/retry`|Retry  failed video|
| `PUT /api/videos/:id`| Update  video|
| `DELETE /api/videos/:id`| Delete video|
| `POST /api/videos/:id/feedback`|submit feedback|
| `GET /api/videos/:id/feedback`|Get feedback|
| `GET /api/videos/:id/getstatus`| used to poll for status when generating video|
| `GET /api/videos/:id`|Get video|
---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) — for local PostgreSQL
- A [Resend](https://resend.com) account for OTP emails

### 1. Clone and install

```bash
git clone https://github.com/Pirate193/foldex-backend.git
cd foldex-backend
bun install
```

### 2. Start PostgreSQL and Redid

```bash
docker compose up -d
```

```bash
docker run -d --name foldex-redis -p 6379:6379 redis:alpine
```

This starts a PostgreSQL 16 container on port 5432 using the config in `docker-compose.yml`.

### 3. Configure environment

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/foldex
RESEND_API_KEY=re_your_key_here
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
FRONTEND_URL=http://localhost:3001
ENCRYPTION_KEY=your_encryption_key
# The URL of your local or cloud-hosted Manim Flask server
MANIM_FLASK_URL=http://localhost:5000
```

To generate `BETTER_AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Push database schema

```bash
bunx drizzle-kit push
```

### 5. Run the server

```bash
# Development (hot reload)
bun dev

# Production
bun run build
bun start
```

Server runs at `http://localhost:3000`.

---

## Project Structure

```
src/
  db/
    schema.ts           # Drizzle schema — all tables and indexes
  lib/
    auth.ts             # Better Auth instance with OTP plugin
    db.ts               # Database connection (pg Pool + Drizzle)
    ai-block-parser.ts  # Converts ai simplified json to blocknote + blocknote to markdown function
    crypto.ts           # encrypt key + decrypt key logic 
    manim-agent.ts      # manim specific agent for generating manim code for videos
    noteagent.ts        # specialized note taking agent 
    video-worker.ts     # BullMQ video generation configurations 
  middleware/
    requireauth.ts      # Session guard middleware
  controllers/
    notecontroller.ts            # Note CRUD logic
    foldercontroller.ts          # Folder CRUD logic
    templatecontroller.ts        # Template CRUD logic
    chatcontroller.ts            # Chat + message logic
    videocontroller.ts           # Video CRUD logic
    settingscontroller.ts        # Settings CRUD + Prompt
    apikeycontroller.ts          # Api CRUD + Validate logic

  routes/
    notesroute.ts           # /api/notes router
    folderroute.ts          # /api/folders router
    templateroute.ts        # /api/templates router
    chatsroute.ts           # /api/chat router
    airoute.ts              # /api/ai streaming 
    videoroute.ts           # /api/videos router
    settingsroute.ts        # /api/settings router  + BYOK CRUD Routes

  
  index.ts              # App entry point — mounts all routes
```

---

## Database Schema

Core tables: `user`, `session`, `account`, `verification` (Better Auth managed), `notes`, `folders`, `templates`, `chats`, `messages`,`videos`,`videofeedback`.

All note content is stored as `jsonb` (BlockNote JSON document).

Run `bunx drizzle-kit studio` to browse your database with a visual UI.

---

## Deployment

The backend is deployed via [Dokploy](https://dokploy.com) using Docker. A `Dockerfile` is included at the root.

```bash
# Build image locally to verify
docker build -t foldex-backend .
docker run -p 3000:3000 --env-file .env foldex-backend
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)