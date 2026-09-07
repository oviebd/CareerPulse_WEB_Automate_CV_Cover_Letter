# CareerPulse — CI/CD and VPS contract (LLM context)

This file is the **source of truth** for automation, operators, and language models working on CareerPulse deployment. Prefer this document over guessing from chat history.

Human-oriented setup steps: [Setup.md](Setup.md). Local Docker: [README.md](README.md). Variable inventory: [`.env.example`](.env.example), [`.env.prod.example`](.env.prod.example).

---

## 1. Project identity (do not collide with other apps)

The VPS may already run **other Docker images, Compose projects, Nginx sites, and databases**. CareerPulse must stay isolated. Never reuse another app’s names, ports, volumes, or directories.

| Resource | CareerPulse value | Notes |
|---|---|---|
| Product | CareerPulse | CV / cover-letter / job-tracking web app |
| Git production branch | `main` | Only this branch deploys |
| GitHub Environment | `production` | Required by the deploy job |
| App directory on VPS | `/opt/careerpulse` | Do not put files under another project’s `/opt/...` |
| Production Compose file | `docker-compose.yml` | Pull-only. No `build:` |
| Local Compose file | `docker-compose.dev.yml` | Build allowed. Not used on the VPS |
| App container | `careerpulse` | Unique on the host |
| DB container | `careerpulse-db` | Unique on the host |
| Local-dev DB container | `careerpulse-db-dev` | Host only; never on VPS |
| Docker network | `careerpulse_internal` | Isolated. Do not attach other apps |
| Local-dev network | `careerpulse_dev_internal` | Host only |
| Compose volume `pgdata` | Postgres data | Scoped to this Compose project |
| Compose volume `uploads` | User uploads | Scoped to this Compose project |
| Image registry | `ghcr.io/<owner>/<repo>` lowercased | Private package |
| Image env var | `CAREERPULSE_IMAGE` | Immutable `sha-<git-sha>` tag in production |
| Local image name | `careerpulse:latest` | From `docker-compose.dev.yml` only |
| Default host bind | `127.0.0.1:3000` | Nginx only. Override `APP_PORT` if taken |
| Postgres inside Compose | `db:5432` | **Not published** on the VPS |
| Nginx example | `infra/nginx-careerpulse.conf.example` | Site name `careerpulse` |
| Backup script | `db/backup.sh` | Dumps via `docker exec careerpulse-db` |
| Backup dir (suggested) | `/opt/careerpulse/backups` | Copy dumps off-box |

**Compose project name:** default is the directory name (`careerpulse` when run from `/opt/careerpulse`). Do not run this compose from another app’s directory.

**Postgres credentials default:** user `careerpulse`, database `careerpulse`. Password comes from `.env.prod` (`POSTGRES_PASSWORD`). `DATABASE_URL` is injected by Compose for the app container — do not point it at another project’s database.

---

## 2. Architecture (production)

```text
Developer → git push / merge to main
  → GitHub Actions: CI tests + next build (compile check)
  → GitHub Actions: docker build (NOT on the VPS)
  → GHCR: tags sha-<commit> and latest
  → SSH/SCP to VPS /opt/careerpulse
  → scripts/vps-pull-up.sh: docker login GHCR, pull, up -d
  → Host Nginx (HTTPS) → 127.0.0.1:${APP_PORT:-3000}
  → Container careerpulse (Next.js standalone + Chromium)
  → Docker network careerpulse_internal → careerpulse-db (Postgres 16)
```

The VPS is a **runtime host**. It must not compile Next.js and must not run `docker compose build`.

Stack:

- Next.js 15 (standalone `server.js`), Node 20
- Postgres 16 Alpine
- Puppeteer + Chromium in the app image (PDF export)
- Auth.js / JWT, Anthropic, optional Google OAuth, Resend, SSLCommerz

---

## 3. File map

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | PRs to `main`: `npm test`, `npm run build`, `npm audit` (audit non-blocking) |
| `.github/workflows/deploy.yml` | Push/`workflow_dispatch` on `main`: test → build/push GHCR → VPS pull-up |
| `Dockerfile` | Multi-stage image. `NEXT_PUBLIC_*` as **build-args only**. Secrets never as build-args |
| `docker-entrypoint.sh` | Chown uploads volume, run `scripts/migrate-runtime.mjs`, drop to `nextjs` uid 1001, start `server.js` |
| `docker-compose.yml` | Production: GHCR image + Postgres. Loopback bind. Named network |
| `docker-compose.dev.yml` | Local: **build** image `careerpulse:latest` + Postgres published on `5432` |
| `scripts/vps-pull-up.sh` | VPS deploy script. Writes `.env.deploy`, pull, up, liveness, prune dangling images |
| `scripts/migrate-runtime.mjs` | Idempotent SQL in `db/migrations/` via `schema_migrations` |
| `db/schema.sql`, `db/seed.sql` | Applied **only** when the Postgres volume is empty |
| `db/migrations/` | Applied on every app start if not already recorded |
| `db/backup.sh` | `pg_dump` from `careerpulse-db` |
| `infra/nginx-careerpulse.conf.example` | Host reverse proxy template |
| `.env.prod` | Runtime secrets on VPS. Gitignored. Never copied by CI |
| `.env.deploy` | Written by CI on VPS. Contains only `CAREERPULSE_IMAGE=...`. Gitignored |
| `.dockerignore` | Excludes `.env*`, `.github`, `*.md`, `Documents/` from the image |

CI copies these to `/opt/careerpulse` (overwrite): `docker-compose.yml`, `db/schema.sql`, `db/seed.sql`, `db/backup.sh`, `infra/nginx-careerpulse.conf.example`, `scripts/vps-pull-up.sh`.

CI does **not** copy `.env.prod`. An operator must create it once from `.env.prod.example`.

---

## 4. Pipelines

### 4.1 PR CI — `.github/workflows/ci.yml`

- Trigger: `pull_request` targeting `main`
- Permissions: `contents: read`
- Node 20, `npm ci`, `npm test` (Vitest), `npm run build` with placeholder `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL=https://example.com`
- `npm audit --audit-level=high` with `continue-on-error: true`

### 4.2 Production CD — `.github/workflows/deploy.yml`

Name: **Deploy CareerPulse**

- Trigger: push to `main`, or `workflow_dispatch`
- Concurrency group: `production-deploy`, `cancel-in-progress: false` (do not cancel a live deploy)
- Jobs (all require `github.ref == refs/heads/main`):
  1. **test** — same as CI plus production compile
  2. **build-and-push** — requires `vars.NEXT_PUBLIC_APP_URL` starting with `https://` and not localhost/internal Docker hostnames. Builds `Dockerfile`, pushes:
     - `ghcr.io/<owner>/<repo>:sha-<GITHUB_SHA>`
     - `ghcr.io/<owner>/<repo>:latest`
     - Build-args: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` only
  3. **deploy** — GitHub Environment `production`. SCP runtime files, then SSH `scripts/vps-pull-up.sh` with `CAREERPULSE_IMAGE`, `GHCR_USER`, `GHCR_TOKEN`

GHCR login on the VPS uses the job `GITHUB_TOKEN` for the duration of the pull. Keep the package **private**. Workflow needs `packages: write`.

---

## 5. GitHub configuration (required)

### Variables (Actions → Variables, and/or Environment)

| Name | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes for CD | Public HTTPS origin, e.g. `https://careerpulse.example.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Public Google OAuth client id |

### Secrets

| Name | Required | Value |
|---|---|---|
| `VPS_HOST` | Yes | VPS hostname or IP |
| `VPS_USER` | Yes | SSH user that can run Docker |
| `VPS_SSH_KEY` | Yes | Private key for that user |
| `VPS_PORT` | Yes | SSH port, usually `22` |

Restrict Environment `production` to branch `main`. Protect `main` (PR + review).

**Never** store `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `POSTGRES_PASSWORD`, payment keys, or OAuth secrets as Docker build-args or `NEXT_PUBLIC_*`. Those live only in VPS `.env.prod`.

---

## 6. Environment variable classes

### PUBLIC BUILD-TIME (baked into the client; changing requires a new image)

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN` — leave empty in Docker/production; local `npm run dev` only

### PRIVATE RUNTIME SECRET (VPS `.env.prod` only)

- `POSTGRES_PASSWORD`
- `AUTH_SECRET`, `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`

### SERVER-ONLY NON-SECRET (VPS `.env.prod`)

- `AUTH_URL` — same HTTPS origin as `NEXT_PUBLIC_APP_URL`
- `AUTH_TRUST_HOST=true` behind Nginx
- `POSTGRES_USER`, `POSTGRES_DB` (defaults `careerpulse`)
- `ANTHROPIC_MODEL`, `CV_ANALYZER_API_MODEL`
- `SSLCOMMERZ_IS_LIVE`
- `SUPER_ADMIN_EMAILS`
- `APP_BIND_HOST` (default `127.0.0.1`)
- `APP_PORT` (default `3000`) — **change this if another app already binds host 3000**
- `CAREERPULSE_IMAGE` — normally written to `.env.deploy` by CI, not hand-edited except rollback
- `SKIP_DB_MIGRATE` — set `true` only to skip entrypoint migrations (emergency)

Compose always sets for the app container: `DATABASE_URL`, `UPLOAD_DIR=/data/uploads`, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.

---

## 7. Shared VPS isolation rules (mandatory)

1. **Do not** use host networking, privileged mode, or mount the Docker socket.
2. **Do not** publish Postgres to `0.0.0.0`. Production compose publishes no DB port.
3. App listens on **loopback** (`APP_BIND_HOST=127.0.0.1`). Public traffic goes through host Nginx, not by exposing 3000 on the public interface.
4. If host port **3000 is already used** by another container or process, set `APP_PORT` in `.env.prod` (e.g. `3001`) and point the CareerPulse Nginx `proxy_pass` at that port. Do not steal another app’s port.
5. Keep Nginx `server_name` unique. Install as `/etc/nginx/sites-available/careerpulse`. Do not edit another project’s vhost to add CareerPulse.
6. Do not join `careerpulse_internal` to other Compose networks.
7. Do not reuse volume names by running two stacks from the same project directory.
8. Image names on GHCR are repo-scoped. Do not retag this image as another product.
9. Resource: app `mem_limit: 2g`. Host should have enough RAM for Chromium **plus** other apps (4 GB+ recommended for this app alone).
10. `docker image prune -f` in `vps-pull-up.sh` only removes dangling images, not other projects’ tagged images. **Never** run `docker system prune -a` on a shared VPS.
11. **Never** `docker compose down -v` on production — that deletes `pgdata` and `uploads`.
12. Backup restore must target `careerpulse-db` and database `careerpulse` only.

---

## 8. VPS first-time checklist

1. Install Docker Engine + Compose plugin; Nginx + Certbot.
2. `mkdir -p /opt/careerpulse` and create `.env.prod` from `.env.prod.example` (real HTTPS URLs, strong secrets, API keys).
3. If port 3000 is taken, set `APP_PORT` before the first deploy.
4. Configure GitHub Variables/Secrets and Environment `production`.
5. Merge to `main` (or run the deploy workflow) so CI copies compose files and pulls the image.
6. Install Nginx site from `infra/nginx-careerpulse.conf.example`; `certbot --nginx -d <hostname>`.
7. Google OAuth callback: `https://<hostname>/api/auth/callback/google`.
8. SSLCommerz IPN: `https://<hostname>/api/payment/ipn`.
9. Schedule `db/backup.sh`; copy dumps off the VPS.

Until `.env.prod` exists, `vps-pull-up.sh` **exits 1**.

---

## 9. Health and smoke tests

| Endpoint | Use | Checks dependencies? |
|---|---|---|
| `GET /api/health/live` | Docker HEALTHCHECK, CD liveness | No. Process only |
| `GET /api/health` | Operator readiness | Yes: DB, `AUTH_SECRET`/`JWT_SECRET`, Anthropic, PDF parser |

CD waits up to ~90s for liveness inside the `app` service. Failure dumps last 80 lines of app logs.

Docker HEALTHCHECK and compose healthcheck both call `http://127.0.0.1:3000/api/health/live`.

---

## 10. Database and migrations

- Empty volume: Postgres init runs `db/schema.sql` then `db/seed.sql` once.
- Every app start: `migrate-runtime.mjs` applies new files in `db/migrations/` (sorted), records names in `schema_migrations`.
- Rolling back the **image** does not undo SQL. If a release shipped a destructive migration, restore a dump first.
- Local hybrid: `npm run db:migrate` (tsx `scripts/migrate.ts`) against host Postgres.

Restore example (maintenance window, this database only):

```bash
gunzip -c dump.sql.gz | docker exec -i careerpulse-db psql -U careerpulse careerpulse
```

Test restore on a non-production volume first.

---

## 11. Rollback

Images are immutable by git SHA.

```bash
cd /opt/careerpulse
printf 'CAREERPULSE_IMAGE=ghcr.io/<owner>/<repo>:sha-<previous-commit>\n' > .env.deploy
docker compose --env-file .env.prod --env-file .env.deploy pull
docker compose --env-file .env.prod --env-file .env.deploy up -d --remove-orphans
```

Do not use `:latest` for rollback. Pin `sha-<commit>`.

---

## 12. Forbidden on the VPS

```bash
docker compose build
docker compose up --build
docker compose down -v
docker system prune -a
```

Also forbidden: putting secrets in GitHub Variables that get passed as Docker build-args; setting `NEXT_PUBLIC_APP_URL` to `localhost` or a Compose service hostname in production; publishing Postgres; running this stack with `--build` from `docker-compose.dev.yml` on the server.

---

## 13. Local vs production

| | Local (`docker-compose.dev.yml`) | VPS (`docker-compose.yml`) |
|---|---|---|
| Build on machine | Yes (`--build`) | No |
| Image | `careerpulse:latest` | `CAREERPULSE_IMAGE` from GHCR |
| Postgres port on host | `5432` | Not published |
| App bind | `3000:3000` | `127.0.0.1:${APP_PORT:-3000}:3000` |
| Network | `careerpulse_dev_internal` | `careerpulse_internal` |
| Containers | `careerpulse`, `careerpulse-db-dev` | `careerpulse`, `careerpulse-db` |
| Env file | `.env.prod` | `.env.prod` + `.env.deploy` |

Hybrid: Docker `db` only + host `npm run dev`. Reads `.env.local`, not `.env.prod`. `UPLOAD_DIR=./data/uploads`. Do not run Docker `app` and `npm run dev` together (both want port 3000).

---

## 14. Operator commands (production)

```bash
cd /opt/careerpulse

# Status
docker compose --env-file .env.prod --env-file .env.deploy ps

# Logs
docker compose --env-file .env.prod --env-file .env.deploy logs --tail=100 -f app

# Manual pull of the tag already in .env.deploy
docker compose --env-file .env.prod --env-file .env.deploy pull
docker compose --env-file .env.prod --env-file .env.deploy up -d --remove-orphans

# Backup
BACKUP_DIR=/opt/careerpulse/backups ./db/backup.sh
```

---

## 15. Troubleshooting (LLM decision hints)

| Symptom | Likely cause | Action |
|---|---|---|
| Deploy script: missing `.env.prod` | First-time VPS | Create from `.env.prod.example`; do not invent another path |
| Bind / port already allocated | Another app uses 3000 | Set `APP_PORT`; update Nginx `proxy_pass` |
| GHCR pull denied | Package permissions / token | Package linked to repo; `packages: write`; optional PAT with `read:packages` on VPS (never commit) |
| Login fails / health `auth_secret` | Missing `AUTH_SECRET` | Edit `.env.prod`, `up -d` (no build) |
| Health 503 database | DB not healthy / wrong password | Check `careerpulse-db` logs; `POSTGRES_PASSWORD` must match volume’s original password |
| Empty DB / missing seed | Init SQL only on new volume | Do not `down -v` to “fix” production |
| PDF export fails | Chromium missing or sandbox | `docker exec careerpulse chromium --version`; image includes Chromium |
| OAuth redirect mismatch | Wrong public URL | `NEXT_PUBLIC_APP_URL` / `AUTH_URL` must match the real HTTPS host; rebuild image if public URL changed |
| Changed `NEXT_PUBLIC_*` but UI stale | Values baked at image build | New commit / rebuild in CI; VPS cannot hot-patch the client bundle |
| Liveness fail after deploy | App crash / migrate fail | App logs; migrations run in entrypoint — failure prevents `server.js` |

---

## 16. Invariants for code changes

When editing this project, preserve:

- Unique container / network / directory names listed in §1
- Pull-only production compose (no `build:` in `docker-compose.yml`)
- Liveness vs readiness split (`/api/health/live` vs `/api/health`)
- No secrets in Docker build-args or GHCR image layers (`.dockerignore` excludes `.env*`)
- Entrypoint migrations remain idempotent
- Deploy concurrency does not cancel in-progress production deploys
- Shared-VPS prune policy: dangling images only

If a change requires a new host port, document `APP_PORT` and Nginx together. If a change requires a new secret, add it to `.env.example` / `.env.prod.example` and **not** to the GitHub build-args list unless it is `NEXT_PUBLIC_*`.
