# CareerPulse — Docker & VPS Deployment Guide

## Prerequisites

- Docker & Docker Compose installed locally (for building/testing)
- A VPS with at least **2 vCPU / 2 GB RAM** (4 GB recommended — Puppeteer is memory-heavy)
- Ubuntu 22.04 LTS on the VPS (recommended)
- A domain name pointed to your VPS IP

---

## Project Files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: compiles Next.js, then creates a lean runner with Chromium for PDF generation |
| `docker-compose.yml` | Orchestration shortcut — loads secrets from `.env.prod` at runtime |
| `.dockerignore` | Excludes `node_modules`, build artifacts, and secrets from the Docker build context |

---

## Environment Variables

### Build-time (`NEXT_PUBLIC_*`)

These are **baked into the client bundle** during `npm run build`. If they change, you must rebuild the image.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `NEXT_PUBLIC_APP_URL` | Your production domain (e.g. `https://yourdomain.com`) |
| `NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN` | Dev-only plan override (leave empty in production) |

### Runtime (secrets — never baked into the image)

Loaded at container start from `.env.prod`. Keep this file out of version control.

| Variable | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `ANTHROPIC_MODEL` | Claude model ID (e.g. `claude-haiku-4-5-20251001`) |
| `CV_ANALYZER_API_MODEL` | Model used for job fit analysis |
| `JWT_SECRET` | Secret for signing JWTs |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz store ID |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz store password |
| `SSLCOMMERZ_IS_LIVE` | `true` for production, `false` for sandbox |

---

## Local Testing

Build and run the container locally before deploying:

```bash
docker compose up --build
```

Visit `http://localhost:3000` to verify the app works. Check logs with:

```bash
docker compose logs -f
```

Stop the container:

```bash
docker compose down
```

---

## VPS Setup (First Time)

### 1. Install Docker

```bash
ssh root@your-vps-ip

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt install -y docker-compose-plugin
```

### 2. Install Nginx and Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 3. Copy Project Files to VPS

From your local machine:

```bash
rsync -az \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  ./ root@your-vps-ip:/app/careerpulse/
```

### 4. Configure Environment on VPS

SSH into the VPS and update `.env.prod`:

```bash
cd /app/careerpulse
nano .env.prod
```

Make sure `NEXT_PUBLIC_APP_URL` is set to your real domain:

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 5. Build and Start the Container

```bash
docker compose up -d --build
```

Verify it's running:

```bash
docker ps
docker logs careerpulse-app-1 -f
```

---

## Nginx Reverse Proxy

Create the site config:

```bash
nano /etc/nginx/sites-available/careerpulse
```

Paste the following (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

Enable it and reload Nginx:

```bash
ln -s /etc/nginx/sites-available/careerpulse /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## SSL Certificate (Free via Let's Encrypt)

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
systemctl enable certbot.timer
```

Certbot auto-updates the Nginx config and sets up auto-renewal.

---

## Deploying Updates

```bash
# On VPS — pull latest code and rebuild
cd /app/careerpulse
git pull
docker compose up -d --build
```

Old containers are replaced automatically. Zero-downtime deployments require a load balancer (optional).

---

## Pros and Cons

### Pros
- Full control over the runtime environment (Node version, Chromium, system libs)
- Puppeteer works reliably — you control the Chromium installation
- Predictable: the same Docker image runs locally and in production
- Easy rollback: re-run the previous image tag
- No vendor lock-in
- Cost-effective for sustained traffic vs. serverless platforms

### Cons
- You manage server security, OS updates, and uptime
- No automatic scaling — provision for peak load manually
- Puppeteer requires ~300 MB of extra Chromium system dependencies in the image
- `NEXT_PUBLIC_*` vars require a full image rebuild if changed
- No CDN edge caching out of the box (add Cloudflare in front to mitigate)

---

## Troubleshooting

**Container exits immediately:**
```bash
docker logs careerpulse-app-1
```

**Puppeteer / PDF generation fails:**
- Confirm `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` is set in the container
- Run `docker exec -it careerpulse-app-1 chromium --version` to verify Chromium is present

**Port 3000 not reachable:**
- Check `docker ps` — container must show `0.0.0.0:3000->3000/tcp`
- Check firewall: `ufw allow 3000` (temporary test) or rely on Nginx on port 80/443

**Out of memory during build:**
- Build locally and push the image to Docker Hub, then pull it on the VPS (avoids ~1.5 GB build RAM usage on the VPS)

```bash
# Local
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -t youruser/careerpulse:latest .
docker push youruser/careerpulse:latest

# VPS
docker pull youruser/careerpulse:latest
docker run -d --name careerpulse --restart unless-stopped \
  --env-file .env.prod \
  -e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  -p 3000:3000 \
  youruser/careerpulse:latest
```
