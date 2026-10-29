# Build context is the repo root (see docker-compose.yml)
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
WORKDIR /app

# Install only what the worker needs
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile --filter @memeradar/worker...

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/db packages/db
COPY packages/emails packages/emails
COPY apps/worker apps/worker

ENV NODE_ENV=production
WORKDIR /app/apps/worker
# tsx forwards SIGTERM so the worker can shut down gracefully
CMD ["pnpm", "start"]
