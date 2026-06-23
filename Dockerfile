# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time — pass them here.
# Secrets (API keys) are NOT needed here; they are injected at runtime via env_file.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN=$NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN
ENV NODE_ENV=production

RUN npm run build && mkdir -p /app/public

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Chromium system dependencies required by Puppeteer for PDF generation
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
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone output from builder (includes node_modules for server-only packages)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Belt-and-suspenders: ship pdfjs + native canvas for CV PDF parsing in standalone output
COPY --from=builder /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder /app/node_modules/@napi-rs ./node_modules/@napi-rs

EXPOSE 3000

CMD ["node", "server.js"]
