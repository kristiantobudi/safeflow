# Stage 1: Pruner
FROM oven/bun:1-alpine AS pruner
WORKDIR /app
RUN bun add -g turbo
COPY . .
RUN turbo prune api --docker

# Stage 2: Installer
FROM oven/bun:1-alpine AS installer
WORKDIR /app

# First copy the pruned json and lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lockb .

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the full source code from pruner stage
COPY --from=pruner /app/out/full/ .

# Generate Prisma Client
RUN cd packages/database && bun run generate

# Stage 3: Builder
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=installer /app .
RUN bun run build --filter=api...

# Stage 4: Runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy only what's needed for production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json

# Production node_modules (including database client)
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/packages/database/node_modules ./packages/database/node_modules

# ENV
ENV NODE_ENV=production
ENV PORT=1945

EXPOSE 1945

# Command to run the application
# We use the built dist in the api app folder
CMD ["bun", "run", "apps/api/dist/main.js"]
