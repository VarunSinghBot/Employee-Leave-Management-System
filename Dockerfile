# syntax=docker/dockerfile:1
# One multi-stage Dockerfile for the whole monorepo.
#   docker build --target backend  -t elms-backend  .
#   docker build --target frontend -t elms-frontend .
# (docker compose builds both for you)

# ------------------------------------------------------------------ base
FROM node:24-slim AS base
# openssl is needed by the Prisma CLI (migrate deploy)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.10.0
WORKDIR /app

# ------------------------------------------------------------------ build
FROM base AS build
# prisma.config.ts requires DATABASE_URL even for `prisma generate`; the real value comes from compose at runtime
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# Copy manifests first so the dependency layer is cached between code changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/prisma.config.ts apps/backend/
COPY apps/backend/prisma apps/backend/prisma
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ------------------------------------------------------------------ backend
# Keeps the full workspace so `prisma migrate deploy` and `pnpm db:seed` (tsx) work inside the container
FROM build AS backend
ENV NODE_ENV=production
WORKDIR /app/apps/backend
RUN mkdir -p uploads
EXPOSE 5000
# Apply pending migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

# ------------------------------------------------------------------ frontend
# Static build served by nginx, which also proxies /api to the backend
FROM nginx:1.29-alpine AS frontend
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
