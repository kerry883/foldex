FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/
COPY packages/ui/package.json ./packages/ui/

RUN bun install --frozen-lockfile

COPY packages/ui ./packages/ui
COPY apps/web ./apps/web

RUN bun run --filter=web build

WORKDIR /app/apps/web
ENV HOST=0.0.0.0
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "start"]
