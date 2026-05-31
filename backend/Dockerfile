# =====================
# Stage 1: Builder
# =====================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# =====================
# Stage 2: Runner
# =====================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Create logs directory and set ownership
RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server.js"]
