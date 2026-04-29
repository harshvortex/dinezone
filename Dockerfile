# ─────────────────────────────────────────
# Stage 1 — Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests only (for cache efficiency)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json  ./packages/types/
COPY packages/utils/package.json  ./packages/utils/
COPY apps/api/package.json         ./apps/api/

# Install ALL deps (including dev — needed for prisma generate + tsc)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/types/  ./packages/types/
COPY packages/utils/  ./packages/utils/
COPY apps/api/        ./apps/api/

# Generate Prisma client
RUN pnpm --filter=@dinespot/api exec prisma generate

# TypeScript build
RUN pnpm --filter=@dinespot/api build

# ─────────────────────────────────────────
# Stage 2 — Production
# ─────────────────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Security: non-root user
RUN addgroup -S dinespot && adduser -S dinespot -G dinespot

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json  ./packages/types/
COPY packages/utils/package.json  ./packages/utils/
COPY apps/api/package.json         ./apps/api/

# Production deps only
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist           ./apps/api/dist
COPY --from=builder /app/apps/api/prisma         ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma    ./node_modules/.prisma
COPY --from=builder /app/packages/types/dist     ./packages/types/dist
COPY --from=builder /app/packages/utils/dist     ./packages/utils/dist

# Switch to non-root user
RUN chown -R dinespot:dinespot /app
USER dinespot

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Run migrations then start server
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/index.js"]
