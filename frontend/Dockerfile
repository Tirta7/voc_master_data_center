# ─────────────────────────────────────────────────────────────
# VOC Billiard — Frontend Dockerfile (Next.js)
# Multi-stage build: deps → builder → production
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: Build Next.js ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argument build-time untuk URL backend (diisi saat docker build)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MQTT_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MQTT_URL=$NEXT_PUBLIC_MQTT_URL

# Build Next.js production bundle
RUN npm run build

# ── Stage 3: Production runner ──────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy hanya file yang dibutuhkan saat runtime
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

CMD ["node", "server.js"]
