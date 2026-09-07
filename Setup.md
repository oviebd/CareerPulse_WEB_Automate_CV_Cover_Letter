# CareerPulse — Docker & VPS Deployment Guide

Production architecture:

```text
GitHub (branch main)
  → CI tests
  → Docker build in GitHub Actions
  → GHCR (sha-<commit> and latest)
  → VPS: docker compose pull && up -d
  → Nginx (HTTPS) → 127.0.0.1:3000
```

The VPS is a **runtime** machine. It must not compile the Next.js app or run `docker compose build`.

LLM/operator contract (names, isolation, pipelines, forbidden commands): **[CICD.md](CICD.md)**.

---

## Prerequisites

- Docker Engine + Compose plugin on the VPS
- About **2 GB RAM** for the app container (4 GB host recommended — Puppeteer is memory-heavy)
- Ubuntu 22.04 LTS (recommended)
- A domain name pointed at the VPS
- GitHub repository with Actions enabled

---

## Environment variables

See [`.env.example`](.env.example) and [`.env.prod.example`](.env.prod.example).

### PUBLIC BUILD-TIME (GitHub Actions **Variables**, also Docker build-args)

These are baked into the browser bundle. Changing them requires a new image.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public **HTTPS** origin, e.g. `https://your-domain`. Never `localhost` or a Docker hostname. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional. Public Google OAuth client id (same as `GOOGLE_CLIENT_ID`). |

### PRIVATE RUNTIME SECRET (VPS `.env.prod` only)

Never pass these as Docker build-args. Never put them in `NEXT_PUBLIC_*`.

| Variable | Notes |
|---|---|
| `POSTGRES_PASSWORD` | Strong password; Compose injects `DATABASE_URL` for `app` |
| `AUTH_SECRET` / `JWT_SECRET` | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `GOOGLE_CLIENT_SECRET` | Server-side OAuth secret |
| `RESEND_API_KEY` | Email |
| `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD` | Payments |

### SERVER-ONLY NON-SECRET (VPS `.env.prod`)

| Variable | Notes |
|---|---|
| `AUTH_URL` | Same HTTPS origin as `NEXT_PUBLIC_APP_URL` |
| `AUTH_TRUST_HOST` | `true` behind Nginx |
| `POSTGRES_USER` / `POSTGRES_DB` | Defaults `careerpulse` |
| `ANTHROPIC_MODEL` / `CV_ANALYZER_API_MODEL` | Model ids |
| `SSLCOMMERZ_IS_LIVE` | `true` only for live payments |
| `SUPER_ADMIN_EMAILS` | Comma-separated bootstrap admins |
| `APP_BIND_HOST` / `APP_PORT` | Defaults `127.0.0.1` and `3000` |
| `CAREERPULSE_IMAGE` | Written by CI into `.env.deploy` |

`DATABASE_URL` is set by Compose for the app container — do not put a public host or credentials in frontend variables.

---

## Local testing (build allowed)

```bash
cp .env.prod.example .env.prod
# set AUTH_SECRET, POSTGRES_PASSWORD, ANTHROPIC_API_KEY, NEXT_PUBLIC_APP_URL=http://localhost:3000
docker compose -f docker-compose.dev.yml --env-file .env.prod up --build
```

Health:

```bash
curl -s http://localhost:3000/api/health/live
curl -s http://localhost:3000/api/health
```

`--build` is for **local development only**.

---

## GitHub configuration (required before CD)

Create a GitHub **Environment** named `production` (used by the deploy job).

### Variables (Settings → Secrets and variables → Actions → Variables)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-real-domain` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional public OAuth client id |

### Secrets

| Name | Value |
|---|---|
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH user that can run Docker |
| `VPS_SSH_KEY` | Private key for that user |
| `VPS_PORT` | SSH port (usually `22`) |

Restrict the `production` environment to the `main` branch. Protect `main` so it only merges via reviewed pull requests.

The image is pushed to `ghcr.io/<owner>/<repo>` (lowercased). Keep the package **private**. The deploy job logs into GHCR on the VPS with the job `GITHUB_TOKEN` for the duration of the pull.

---

## VPS first-time setup

### 1. Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt install -y docker-compose-plugin
```

### 2. Nginx and Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 3. Application directory

```bash
mkdir -p /opt/careerpulse
# copy .env.prod.example from the repo, then:
nano /opt/careerpulse/.env.prod
```

Set production values (HTTPS `NEXT_PUBLIC_APP_URL` and `AUTH_URL`, strong `POSTGRES_PASSWORD`, `AUTH_SECRET`, API keys). Do not commit this file.

CI copies `docker-compose.yml`, `db/*.sql`, and `scripts/vps-pull-up.sh` into `/opt/careerpulse`. Schema/seed SQL are used only when the Postgres volume is empty.

### 4. Reverse proxy

Use [`infra/nginx-careerpulse.conf.example`](infra/nginx-careerpulse.conf.example). Replace the hostname, enable the site, then:

```bash
certbot --nginx -d your-domain
systemctl enable certbot.timer
```

Google OAuth redirect: `https://your-domain/api/auth/callback/google`.

SSLCommerz IPN: `https://your-domain/api/payment/ipn`.

### 5. Backups

```bash
# from /opt/careerpulse after the db container exists
chmod +x db/backup.sh
BACKUP_DIR=/opt/careerpulse/backups ./db/backup.sh
```

Schedule nightly via cron (example):

```bash
0 2 * * * cd /opt/careerpulse && BACKUP_DIR=/opt/careerpulse/backups ./db/backup.sh
```

Copy gzip dumps off the VPS. Restore is `gunzip -c dump.sql.gz | docker exec -i careerpulse-db psql -U careerpulse careerpulse` after a maintenance window. Test restore on a non-production volume first.

---

## Production deploy (CI)

Push or merge to **`main`**. The workflow:

1. Runs unit tests (`npm test`). Failed tests stop the pipeline.
2. Builds the production image in GitHub Actions (not on the VPS).
3. Pushes `sha-<git-sha>` and `latest` to GHCR.
4. Copies Compose/SQL to `/opt/careerpulse`.
5. Runs [`scripts/vps-pull-up.sh`](scripts/vps-pull-up.sh): `docker compose pull` then `docker compose up -d`.
6. Checks `GET /api/health/live`.

Forbidden on the VPS:

```bash
docker compose build
docker compose up --build
docker compose down -v
docker system prune -a
```

---

## Rollback

Images are immutable by commit. On the VPS:

```bash
cd /opt/careerpulse
printf 'CAREERPULSE_IMAGE=ghcr.io/<owner>/<repo>:sha-<previous-commit>\n' > .env.deploy
docker compose --env-file .env.prod --env-file .env.deploy pull
docker compose --env-file .env.prod --env-file .env.deploy up -d --remove-orphans
```

Rolling back application code does **not** undo database migrations. If a release included a destructive schema change, restore from backup first.

---

## Health

| URL | Meaning |
|---|---|
| `/api/health/live` | Process is up (Docker / CD) |
| `/api/health` | Database, auth secret, Anthropic, PDF parser |

---

## Shared VPS notes

- App network: `careerpulse_internal` (not shared with other apps).
- Postgres is not published.
- App binds `127.0.0.1:3000` by default. If another app uses host port 3000, set `APP_PORT` in `.env.prod`.
- No Docker socket, privileged mode, or host networking.
- Independent volumes `pgdata` and `uploads`.

---

## Troubleshooting

**Container exits immediately**

```bash
cd /opt/careerpulse
docker compose --env-file .env.prod --env-file .env.deploy logs --tail=100 app
```

**Login fails / missing AUTH_SECRET**  
Set `AUTH_SECRET` in `.env.prod` and recreate the app container (`up -d`, no `--build`).

**PDF export fails**  
`docker exec careerpulse chromium --version`

**GHCR pull denied**  
Confirm the package is linked to this repository and the deploy job `packages: write` permission is present. If the token cannot pull, create a `read:packages` PAT and switch the VPS login to that credential (do not commit it).
