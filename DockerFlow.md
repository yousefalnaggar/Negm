# Docker Flow — how the NEGM store is packaged and run

This explains the Docker setup in plain terms: what an image and a container are, what's inside
ours, how it's built, how it runs, where the database and photos live, and how a deploy will flow.

---

## 1. The short version

- **One image holds the whole Next.js app.** Storefront pages, admin panel, Server Actions, API
  routes: in Next.js the "frontend" and "backend" are the same server process (`node server.js`).
- **The database is NOT in that image.** Postgres runs in its own, separate container and keeps its
  data in a Docker volume. The app talks to it over the network using `DATABASE_URL`.
- **Photos are in neither.** They live in Cloudflare R2. The app uploads to R2, and visitors'
  browsers download photos straight from R2.
- **Secrets are never inside the image.** They're given to the container when it starts.

```
                 ┌──────────────── VPS (Dokploy) ─────────────────┐
 Visitor ──HTTPS─►  Traefik (Dokploy's proxy, HTTPS certificates) │
                 │       │                                         │
                 │       ▼                                         │
                 │  ┌────────────────────┐      ┌───────────────┐  │
                 │  │ negm-store         │ SQL  │ Postgres      │  │
                 │  │ container          ├─────►│ container     │  │
                 │  │ (our image)        │      │ + data volume │  │
                 │  └─────────┬──────────┘      └───────────────┘  │
                 └────────────┼────────────────────────────────────┘
                              │ upload / delete photos (S3 API)
                              ▼
 Visitor's browser ◄──photos── Cloudflare R2 (cdn.<domain>)
```

---

## 2. Image vs container

| Term | What it is | Analogy |
|---|---|---|
| **Dockerfile** | The recipe: step-by-step instructions for building the image | A recipe card |
| **Image** | The finished, read-only package: an operating system layer, Node.js, our built app and its packages | A frozen, ready-made meal |
| **Container** | A running instance of an image, with its own processes, network and settings | The meal heated and served |
| **Volume** | Storage that lives outside containers and survives them being replaced | The fridge: the meal is gone, the fridge stays |
| **Registry** | A place to store and download images (we'll use GitHub's `ghcr.io`) | A warehouse |

You **build** an image once, then **run** it as many containers as you like. Deploying a new
version means building a new image and replacing the old container with one made from it. Anything
written inside the old container is thrown away, which is why the database uses a volume and photos
live in R2.

---

## 3. The files involved

| File | Purpose |
|---|---|
| `Dockerfile` | The recipe for the production image |
| `.dockerignore` | Files Docker must never copy into the build: `.env` (secrets), `node_modules`, `.next`, `public/uploads`, `.git`, `src/generated` |
| `next.config.ts` → `output: "standalone"` | Makes `next build` produce a self-contained server in `.next/standalone` with only the packages the app actually uses |
| `src/lib/env.ts` | Checks the settings when the server starts; skips that check during the build, where no secrets exist |
| `prisma.config.ts` | Prisma settings; reads `DATABASE_URL` without requiring it, because `prisma generate` runs during the build |
| `docker-compose.dev.yml` | **Development only**: runs Postgres on your PC. Not used in production |

---

## 4. The Dockerfile, stage by stage

The Dockerfile is **multi-stage**. Several temporary images are built, and only the last one
(`runner`) becomes the image we ship. The earlier stages are throw-away workshops, so build tools,
dev packages and source code never reach the final image.

```
  base ──┬──► deps ──► builder ──┐
         │                       ├──► runner  (the image we ship)
         └──► migrator ──────────┘
```

### Stage 0 — `base` (shared starting point)

```dockerfile
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
```

- **`node:24-bookworm-slim`**: the official Node.js 24 image on Debian 12 ("bookworm"), "slim" meaning
  a minimal Linux without extras.
- **`WORKDIR /app`**: everything happens in the `/app` folder inside the image.
- **`NEXT_TELEMETRY_DISABLED=1`**: stops Next.js sending anonymous usage stats.
- **`openssl`**: Prisma's migration engine needs it, and the slim image doesn't include it. Without
  it, migrations would fail on the server (we hit this in the first test build).

### Stage 1 — `deps` (install packages)

```dockerfile
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
```

- **`npm ci`** installs exactly the versions in `package-lock.json`: the same tree every time.
- It installs **dev packages too** (TypeScript, Tailwind…), because they're needed to *build*.
  They never reach the final image.
- The Prisma files are copied first because `npm ci` runs our `postinstall` script
  (`prisma generate`), which needs the schema.
- Packages are installed **inside Linux**, so native ones such as `sharp` (image processing) get
  their Linux versions, not the Windows ones on your PC.
- **Caching:** this stage only re-runs when `package.json`, `package-lock.json` or the Prisma files
  change. Code-only changes reuse it, which keeps builds fast.

### Stage 2 — `builder` (build the app)

```dockerfile
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```

- Takes the packages from `deps`, copies the source code (minus everything in `.dockerignore`), then
  runs `npm run build` = `prisma generate && next build`.
- `next build` compiles every page and, because of `output: "standalone"`, writes:
  - `.next/standalone/`: `server.js` plus a **trimmed `node_modules`** (only the ~30 packages the
    server really uses, 46 MB instead of hundreds);
  - `.next/static/`: the browser files (JS chunks, CSS, fonts).
- **No secrets exist here.** `env.ts` uses harmless placeholders while building; the real values
  only arrive when the container starts.

### Stage 3 — `migrator` (the database migration tool)

```dockerfile
FROM base AS migrator
WORKDIR /migrate
COPY package-lock.json /tmp/
RUN node <<'EOF'   # writes a package.json with the locked prisma + dotenv versions
...
EOF
RUN npm install --omit=dev --no-audit --no-fund
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/
COPY prisma/migrations ./prisma/migrations
```

- The trimmed app doesn't include the **Prisma CLI**, the tool that applies migrations. This stage
  installs it separately, **at the exact version in your lock file**, so the app and the migration
  tool always match.
- `allowScripts` in that small `package.json` lets Prisma download its migration engine during
  install (npm 11 blocks install scripts unless allowed).
- It copies only what migrations need: the config, the schema and the `migrations/` folder.

### Stage 4 — `runner` (the image we ship)

```dockerfile
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder  --chown=node:node /app/.next/standalone ./
COPY --from=builder  --chown=node:node /app/.next/static ./.next/static
COPY --from=builder  --chown=node:node /app/public ./public
COPY --from=migrator --chown=node:node /migrate ./migrate
USER node
EXPOSE 3000
HEALTHCHECK ... fetch('http://127.0.0.1:3000/api/health') ...
CMD ["sh", "-c", "cd migrate && ./node_modules/.bin/prisma migrate deploy && cd .. && exec node server.js"]
```

- **`NODE_ENV=production`**: production mode (secure cookies, no dev tools).
- **`HOSTNAME=0.0.0.0`**: listen on all network interfaces, so traffic from outside the container
  can reach it. `localhost` alone would only accept connections from inside the container.
- **The `COPY` lines** take only the finished pieces from the earlier stages.
- **`--chown=node:node` + `USER node`**: the app runs as the unprivileged `node` user, not `root`.
  If someone ever found a hole in the app, they'd get a restricted user, not full control.
- **`EXPOSE 3000`**: documents that the app listens on port 3000 inside the container.
- **`HEALTHCHECK`**: every 30 s Docker calls `/api/health`, which runs `SELECT 1` against the database.
  Dokploy uses this to know the new version really works before switching traffic to it.
- **`CMD`** is what runs each time a container starts:
  1. `prisma migrate deploy`: applies any new database migrations, or does nothing if up to date.
  2. `exec node server.js`: starts the store. (`exec` makes Node the main process, so a stop
     signal reaches it and it shuts down cleanly.)

  If the migration step fails, the server doesn't start, so a broken database update never goes live
  half-applied.

---

## 5. What's inside the image we built

Measured on the image built and tested on 2026-10-19 (`negm-store:test`, **744 MB**):

```
/app
├── server.js            8 KB    the Next.js production server (entry point)
├── package.json         4 KB
├── node_modules/       46 MB    ~30 packages the server really uses: next, react, react-dom,
│                                @prisma/*, pg, sharp + @img (libvips), @aws-sdk, …
├── .next/              7.2 MB   compiled pages, routes and manifests
│   └── static/        1.3 MB    browser JS, CSS and fonts
├── public/             1.2 MB   hero/about/review photos, partner logos, flags, favicon
└── migrate/          253 MB    Prisma CLI + schema + migrations (only used on startup)
```

Where the 744 MB comes from:

| Part | Size |
|---|---|
| Debian slim + Node.js 24 (the base image) | ~260 MB |
| OpenSSL | 7 MB |
| **Our app** (standalone server + static + public) | **~56 MB** |
| Prisma CLI for migrations | ~265 MB |

**Not in the image:** your source code (TypeScript), dev packages, `.env` and any secrets,
`public/uploads`, the git history, the database and its data, and product photos.

### So, is this the whole app?

**Yes, all of the Next.js app.** Next.js is one server that does both jobs:

| Part | Where it runs |
|---|---|
| Store pages (home, products, cart, checkout…) | Rendered by `server.js`, sent as HTML |
| Admin panel | Same server, same process |
| "Backend" logic (add to cart, place order, login, uploads) | Server Actions inside the same server |
| API routes (`/api/health`) | Same server |
| Browser JavaScript (menus, sliders, dark mode) | Downloaded from `.next/static` and runs in the visitor's browser |

There's no separate backend container. **The only other services are Postgres and R2.**

---

## 6. Where everything lives

| Thing | Development (your PC) | Production (VPS + Dokploy) |
|---|---|---|
| Next.js app | `npm run dev`, straight on Windows, no Docker | **Our image** running as a container |
| Postgres | Container `store-db-1` from `docker-compose.dev.yml` (image `postgres:18-alpine`), on `localhost:5434` | A **Dokploy Postgres service**: its own container, not reachable from the internet |
| Database data | Docker volume `store_pg_dev` | A Docker volume managed by Dokploy, plus daily backups |
| Product and category photos | R2 bucket `negm-dev` | R2 bucket `negm-prod`, served from `cdn.<domain>` |
| Site images (hero, logos, flags) | `public/` | Inside the image (`/app/public`) |
| Secrets (`.env` values) | `store/.env` | Dokploy's environment settings for the app |
| HTTPS | none (`http://localhost`) | Traefik (Dokploy's proxy) with Let's Encrypt |

**Why the database gets its own container:** the app container is replaced on every deploy, while
the database must keep its data forever. Separate containers let you redeploy the app 100 times
without touching the data. Each one is updated, restarted and backed up on its own.

---

## 7. How settings reach the container

```
Dokploy "Environment" tab ──► injected as environment variables when the container starts
                                    │
                                    ▼
                         src/lib/env.ts checks them
                         ├── all valid → server starts
                         └── missing/invalid → clear error, server refuses to start
```

| Variable | Example in production |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@<dokploy-postgres-host>:5432/store` |
| `BETTER_AUTH_SECRET` | a random 32+ character value |
| `BETTER_AUTH_URL`, `SITE_URL` | `https://<domain>` |
| `MEDIA_BASE_URL` | `https://cdn.<domain>` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | your R2 credentials, `negm-prod` |

The **same image** works for testing and production; only these values differ. That's why
secrets must never be baked into the image.

---

## 8. Flows

### 8.1 Build flow (what happens on `docker build`)

```
source code (minus .dockerignore)
   │
   ├─ deps:     npm ci (all packages, Linux versions)
   ├─ builder:  prisma generate → next build → .next/standalone + .next/static
   ├─ migrator: Prisma CLI at the locked version + schema + migrations
   └─ runner:   copies only the finished pieces → final image (no secrets)
```

### 8.2 Container start flow

```
docker run / Dokploy deploy
   │
   ├─ environment variables injected (secrets)
   ├─ prisma migrate deploy ──► connects to Postgres ──► applies new migrations (or none)
   ├─ node server.js ──► env.ts validates settings ──► listening on :3000
   └─ HEALTHCHECK every 30 s ──► /api/health ──► SELECT 1 on the database ──► healthy
```

### 8.3 A visitor opens a product page

```
Browser ──HTTPS──► Traefik ──► container :3000 (server.js)
                                   │
                                   ├─ query Postgres (product, price, stock)
                                   └─ render HTML with <img src="https://cdn.<domain>/products/…webp">
Browser ◄── HTML
Browser ──► cdn.<domain> (Cloudflare cache, R2 behind it) ──► photo
```

The photo never passes through your server; only the HTML does.

### 8.4 The admin uploads a photo

```
Admin's browser ──file──► container (Server Action)
                              ├─ sharp: check it's a real image, rotate, strip metadata, WebP ≤1600px
                              ├─ upload to R2 (S3 API)       ──► negm-prod/products/<id>/<random>.webp
                              └─ save only the file name in Postgres
```

### 8.5 Deploy flow (planned: the next steps on the list)

```
you: git push to main
   │
   ▼
GitHub Actions (GitHub's machines, not your VPS)
   ├─ docker build  (this Dockerfile)
   ├─ push image ──► ghcr.io/yousefalnaggar/negm   (private registry)
   └─ call Dokploy's deploy webhook
                     │
                     ▼
Dokploy on the VPS
   ├─ pull the new image
   ├─ start a new container (migrations → server)
   ├─ wait for the health check to pass
   └─ switch traffic to it, stop the old container
```

The VPS only downloads and runs the finished image. The heavy build (1.5–3 GB of RAM, full CPU)
happens on GitHub, which is what makes a 1-vCPU KVM 1 enough.

---

## 9. How it was tested (2026-10-19)

The image was built locally, then run on port 3100 against the local database and the `negm-dev`
bucket:

| Check | Result |
|---|---|
| Startup | Migrations: "No pending migrations"; server ready; running as user `node` |
| Pages (EN + AR home, products, filtered products, product, about), sitemap, robots, health | All 200 |
| R2 photos | 14/14 on the home page, 20/20 on the products page |
| Security headers | Present; `X-Powered-By` hidden |
| Add to cart | Works; cart cookie `Secure` + `HttpOnly` |
| Admin login | Works |
| Photo upload | Processed by sharp **inside the container**, stored in R2 |
| Delete product | Photo removed from R2 (returns 404) |

**Problems found and fixed during the build:**
- Prisma fetched its engine for the wrong OpenSSL version, which would have broken migrations on the
  server. Fixed by adding `openssl` to the base image and allowing Prisma's install scripts.
- Better Auth logged "default secret" errors during the build. Fixed with build-only placeholders in
  `env.ts`, so real errors aren't hidden in a noisy log.

---

## 10. Useful commands

```bash
# Build the image (from the store folder)
docker build -t negm-store .

# Run it locally on port 3100 (env file WITHOUT quotes around values)
docker run --rm -p 127.0.0.1:3100:3000 --env-file my-test.env negm-store

# See running containers, logs, health
docker ps
docker logs <container>
docker inspect -f '{{.State.Health.Status}}' <container>

# Look inside the image
docker run --rm --entrypoint sh negm-store -c 'ls -la /app'

# Image size and layers
docker images negm-store
docker history negm-store
```

For a local test, `DATABASE_URL` must use `host.docker.internal` instead of `localhost`. Inside a
container, `localhost` means the container itself, not your PC.

---

## 11. Possible improvements (not needed for launch)

- **Smaller image:** the Prisma CLI is ~265 MB of the 744 MB. It could run migrations from a
  separate one-off container instead. That saves disk and download time, at the cost of a more
  complex deploy.
- **Pin the Node version** (e.g. `node:24.22-bookworm-slim`) so a rebuild can't silently pick up a
  newer Node 24 release. `node:24` follows the latest 24.x; the test image used 24.22.0.
