# ==============================================================
# SD-OS Monorepo Dockerfile
# Build with: docker build --build-arg APP=backend -t sdos-backend .
#             docker build --build-arg APP=frontend -t sdos-frontend .
# ==============================================================

ARG NODE_VERSION=20-alpine

# ---- Base ----
FROM node:${NODE_VERSION} AS base
RUN npm install -g turbo
WORKDIR /app

# ---- Prune ----
FROM base AS pruner
COPY . .
RUN turbo prune --scope=$APP --docker

# ---- Install deps ----
FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

# ---- Build (includes dev deps) ----
FROM base AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=installer /app/ .
RUN if [ "$APP" = "backend" ]; then npm run db:generate --filter=@sd-os/db; fi
RUN npm run build --filter=$APP...

# ---- Runner: backend ----
FROM base AS backend-runner
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000
CMD ["node", "apps/backend/dist/app.js"]

# ---- Runner: frontend ----
FROM base AS frontend-runner
WORKDIR /app

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/frontend/server.js"]
