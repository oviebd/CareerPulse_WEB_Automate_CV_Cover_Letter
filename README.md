# CareerPulse

CV and cover-letter generator with job tracking, templates, PDF export, and billing. The self-hosted stack is **Next.js + Postgres**, packaged as Docker images.

For VPS / Nginx / SSL deployment, see [Setup.md](Setup.md).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows) or Docker Engine + [Compose plugin](https://docs.docker.com/compose/install/) (Linux)
- About **4 GB RAM** free — the image build compiles Next.js and the runner includes Chromium for PDF generation
- An [Anthropic API key](https://console.anthropic.com/) for CV / cover-letter generation

Ports **3000** (app) and **5432** (Postgres, local compose only) must be free.

---

## Run the dockerized app locally

This starts **Postgres + the production Next.js image** together. Use this when you want the same stack that ships to the VPS.

### 1. Create `.env.prod`

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod` and set at least:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local Docker |
| `POSTGRES_PASSWORD` | Any password; compose injects it into `DATABASE_URL` |
| `AUTH_SECRET` | Required for login. Generate with `openssl rand -base64 32` |
| `JWT_SECRET` | Can be the same value as `AUTH_SECRET` |
| `ANTHROPIC_API_KEY` | Required for AI generation |

Google OAuth, Resend, and SSLCommerz can stay empty until you need those features.

`DATABASE_URL` is set by Compose for the app container — you do not need to add it to `.env.prod`.

### 2. Build and start

```bash
docker compose -f docker-compose.dev.yml --env-file .env.prod up --build
```

First build takes several minutes. When it finishes:

- App: [http://localhost:3000](http://localhost:3000)
- Postgres: `localhost:5432` (user/password/db from `.env.prod`)
- Schema and CV/cover-letter templates are applied automatically on the **first** database start

### 3. Check that it is healthy

```bash
curl -s http://localhost:3000/api/health | python3 -m json.tool
```

You want `"status": "ok"` and `database.detail` of `postgres_connected`. If Anthropic is misconfigured, the response is `503` with details in `checks`.

Register a new account at `/register`, then sign in at `/login`.

### Everyday commands

```bash
# Follow logs
docker compose -f docker-compose.dev.yml logs -f

# Stop (keeps database data)
docker compose -f docker-compose.dev.yml down

# Rebuild after changing NEXT_PUBLIC_* vars (they are baked into the client bundle)
docker compose -f docker-compose.dev.yml --env-file .env.prod up --build

# Wipe Postgres + uploads and start clean (re-runs schema.sql + seed.sql)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml --env-file .env.prod up --build
```

---

## Hybrid development (hot reload)

Use this when you are editing the Next.js app and want fast refresh. Postgres still runs in Docker; the app runs on the host.

**Terminal 1 — database only:**

```bash
docker compose -f docker-compose.dev.yml --env-file .env.prod up db
```

**`.env.local`** (create next to `package.json`):

```
DATABASE_URL=postgresql://careerpulse:careerpulse_dev@localhost:5432/careerpulse
AUTH_SECRET=change-me-to-a-long-random-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=your-key
```

Match `DATABASE_URL` to `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` in `.env.prod`.

**Terminal 2 — Next.js:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Do not run the Docker `app` service at the same time — both bind port 3000.

---

## How the Docker files fit together

| File | Role |
|---|---|
| `Dockerfile` | Multi-stage build: Next.js standalone server + Chromium for PDF export |
| `docker-compose.dev.yml` | **Local:** builds the image and runs `app` + `db` |
| `docker-compose.yml` | **Production:** runs a pre-built `careerpulse:latest` image + Postgres (no build step) |
| `.env.prod` | Runtime secrets. Gitignored. Loaded by Compose |
| `db/schema.sql` / `db/seed.sql` | Applied once when the Postgres volume is empty |

`NEXT_PUBLIC_*` values are compiled into the client during `docker build`. Changing them requires `--build`. API keys stay out of the image and are injected at container start.

---

## Troubleshooting

**`Bind for 0.0.0.0:3000 failed` or port 5432 in use**  
Stop whatever is already on that port (`npm run dev`, another Postgres, or a leftover container):

```bash
docker compose -f docker-compose.dev.yml down
```

**Container exits immediately**

```bash
docker compose -f docker-compose.dev.yml logs app
```

**Login fails / health reports `auth_secret` not set**  
Set `AUTH_SECRET` in `.env.prod` and recreate the app container (`up --build` again).

**Empty database after you expected seed data**  
Init scripts only run on a new volume. Reset with `down -v`, then `up --build`.

**PDF export fails**  
Confirm Chromium is in the image:

```bash
docker exec -it careerpulse chromium --version
```

**Out of memory during build**  
Close other apps or give Docker more RAM (Settings → Resources). The VPS path in [Setup.md](Setup.md) also covers building locally and loading the image on the server.

---

## Production

CI builds `careerpulse:latest` and streams it to the VPS. On the server:

```bash
cd /opt/careerpulse
docker compose --env-file .env.prod up -d --pull never
```

Full VPS, Nginx, SSL, backup, and update steps: **[Setup.md](Setup.md)**.
