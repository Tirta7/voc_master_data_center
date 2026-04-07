# ─────────────────────────────────────────────────────────────
# VOC Billiard — Backend Dockerfile (NestJS)
# Multi-stage build: builder → production
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies dulu (cache layer)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build NestJS ke /app/dist
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production

# Install Chromium deps untuk Puppeteer (PDF generation)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer agar pakai Chromium bawaan Alpine
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Hanya copy package.json untuk install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy hasil build dari stage sebelumnya
COPY --from=builder /app/dist ./dist

# Copy assets/public jika ada
COPY --from=builder /app/public ./public
COPY --from=builder /app/assets ./assets 2>/dev/null || true

# Buat folder storage untuk upload file
RUN mkdir -p /app/storage /app/logs

# Expose port backend
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Jalankan aplikasi
CMD ["node", "dist/main"]
