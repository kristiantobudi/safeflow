# Stage 1: Pruner
FROM oven/bun:1-alpine AS pruner
WORKDIR /app
RUN bun add -g turbo
COPY . .
RUN turbo prune web --docker

# Stage 2: Installer
FROM oven/bun:1-alpine AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lockb .
RUN bun install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# Stage 3: Builder
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=installer /app .
RUN bun run build --filter=web...

# Stage 4: Runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# The standalone build outputs a server.js file in the specific app's standalone directory
# Due to turborepo/nextjs structure, we might need to point to apps/web/server.js
CMD ["bun", "run", "apps/web/server.js"]
