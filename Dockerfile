# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Public NEXT_PUBLIC_* values are baked into the client bundle.
# Never pass private runtime secrets as build args.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN=$NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN
ENV NODE_ENV=production
# Build-time placeholder only.
# The real AUTH_SECRET is provided at runtime from VPS .env.prod.
ENV AUTH_SECRET=ci-build-placeholder-not-for-production

RUN npm run build && mkdir -p /app/public

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Chromium (PDF export) + gosu (drop root after volume chown)
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  gosu \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --home-dir /app --shell /usr/sbin/nologin nextjs

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/data/uploads

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/templates ./src/templates
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/db/migrations ./db/migrations
COPY --from=builder /app/scripts/migrate-runtime.mjs ./scripts/migrate-runtime.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Extra native/parser packages Next standalone tracing can miss
COPY --from=builder /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder /app/node_modules/pdf-parse ./node_modules/pdf-parse
COPY --from=builder /app/node_modules/@napi-rs ./node_modules/@napi-rs
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /data/uploads \
  && chown -R nextjs:nodejs /app /data/uploads

EXPOSE 3000

# Liveness only — full dependency checks are at GET /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Entrypoint starts as root to chown the uploads volume, then drops to nextjs.
# Chromium PDF export uses --no-sandbox (see src/services/pdfRenderer.ts).
ENTRYPOINT ["/app/docker-entrypoint.sh"]
