# =====================
# Stage 1: Builder
# =====================
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL is required by Prisma's schema and query engines on Alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# =====================
# Stage 2: Runner
# =====================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# OpenSSL required at runtime by Prisma query engine
RUN apk add --no-cache openssl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma      ./prisma
COPY package.json ./

RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

CMD ["node", "dist/server.js"]
