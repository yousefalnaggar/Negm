# Production List — NEGM store

What's left before the store can go live on a VPS with Dokploy.
Steps are in order. **[Claude]** = code changes in this repo. **[You]** = accounts, server, content.

Plan assumed: KVM 1 (1 vCPU / 4 GB) or KVM 2, Dokploy, photos on Cloudflare R2, image built on GitHub Actions.

---

## Phase 1 — Code (before the first deploy)

### 1. Commit the R2 work [Claude]
- [x] ~~Commit `storage.ts` (R2 mode), the seed change, `scripts/upload-to-r2.ts` and the docs~~ (commit `ba66c8d`)

### 2. Docker image [Claude]
- [x] ~~`next.config.ts`: `output: "standalone"`~~
- [x] ~~`Dockerfile`: multi-stage, Node LTS, non-root user, sharp working, Prisma client generated~~
- [x] ~~Container start runs `prisma migrate deploy`, then starts the app (needs the Prisma CLI and `prisma.config.ts` in the image)~~
- [x] ~~`.dockerignore` (`.env`, `node_modules`, `.next`, `public/uploads`)~~
- [x] ~~Test the image locally against the dev database~~ (pages, R2 photos, cart, admin login, upload via sharp, delete)

### 3. Build on GitHub instead of the VPS [Claude]
- [ ] `.github/workflows/deploy.yml`: build the image on push to `main`, push it to GitHub Container Registry (`ghcr.io`), then call Dokploy's deploy webhook
- Why: `next build` needs 1.5–3 GB RAM and the whole CPU; on KVM 1 it would slow or crash the live site

### 4. Build without secrets [Claude]
- [x] ~~`src/lib/env.ts` validates at import, so `next build` fails without the real variables. Skip the check during the build and keep it at runtime~~ (also `prisma.config.ts` no longer requires `DATABASE_URL` for `prisma generate`)

### 5. Production seed [Claude]
- [ ] A production mode that creates only the settings row and the first admin, with no demo products or Unsplash photos
- [ ] Runnable inside the container (the current seed needs `tsx`, a dev dependency)

### 6. Security [Claude]
- [ ] Client IP for the login rate limiter: read `CF-Connecting-IP` when behind Cloudflare's proxy, otherwise the last `X-Forwarded-For` entry from Dokploy's Traefik. The comment in `src/lib/rate-limit.ts` still mentions Caddy
- [ ] HSTS header
- [ ] Content-Security-Policy: `img-src 'self' data: https://cdn.<domain>`, `frame-ancestors 'none'`
- [ ] Fix the outdated comment in `docker-compose.dev.yml` (it mentions a production compose file we won't use)

---

## Phase 2 — Accounts and domain [You]

### 7. GitHub
- [x] ~~Create an empty **private** repo, send the URL, and Claude connects and pushes~~ (`github.com/yousefalnaggar/Negm`, branch `main`)
- [ ] Create a token (read packages) so Dokploy can pull the private image

### 8. Domain
- [ ] Buy the domain (any registrar, or Cloudflare Registrar at cost)
- [ ] Add it to Cloudflare (Free plan) and switch the registrar's nameservers to Cloudflare's two
- [ ] Turn on the Cloudflare billing notification

### 9. R2 production bucket
- [ ] Create `negm-prod`
- [ ] Make sure the API token covers `negm-prod` too (edit the token if it only has `negm-dev`)
- [ ] Bucket → Settings → Custom Domains → `cdn.<domain>`
- [ ] Don't use r2.dev in production: it's rate-limited and not cached

---

## Phase 3 — Server [You, with Claude's checklist]

### 10. VPS hardening
- [ ] Log in with SSH keys only; disable password and root login
- [ ] Firewall: allow 22, 80, 443 only. Restrict the Dokploy panel (port 3000) to your IP or put it behind its own domain
- [ ] Automatic security updates
- [ ] 4 GB swap file (safety net against out-of-memory kills)

### 11. Dokploy
- [ ] Install Dokploy and secure the panel (strong password, 2FA)
- [ ] **Postgres** service: strong password, **no published port**
- [ ] **Backups**: daily Postgres backups to an off-server S3 destination (an R2 bucket such as `negm-backups` works)
- [ ] **App**: source = Docker image from `ghcr.io`, with the registry credentials
- [ ] **Environment variables**:
  - `DATABASE_URL` = internal Postgres hostname from Dokploy
  - `BETTER_AUTH_SECRET` = new random value (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`)
  - `BETTER_AUTH_URL` and `SITE_URL` = `https://<domain>`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=negm-prod`
  - `MEDIA_BASE_URL=https://cdn.<domain>`
  - `ADMIN_EMAIL` (a real address) and `ADMIN_PASSWORD` (strong) for the first seed only
- [ ] **Domain** in Dokploy: `<domain>` (and `www`) with Let's Encrypt HTTPS; Cloudflare DNS A record → VPS IP
- [ ] **Health check**: `/api/health`
- [ ] Copy the deploy webhook URL into the GitHub repo secrets

### 12. First deploy
- [ ] Push to `main` → GitHub builds → Dokploy deploys → migrations run
- [ ] Run the production seed once, log in to admin, then **delete `ADMIN_PASSWORD`** from the environment
- [ ] Set the real store name, phone (used by every WhatsApp button) and shipping fee in Settings

---

## Phase 4 — Content [You]

### 13. Real data
- [ ] Categories with photos (upload them in Admin → Categories)
- [ ] Real products: names (AR + EN), descriptions, prices, stock, photos
- [ ] Home page: hero photo (`public/images/hero.webp`), about photo, review photos (`public/images/reviews/`)
- [ ] Partner logos (`public/partners/*.svg`) and their names in `src/app/[locale]/(store)/page.tsx`. Use only real partners with permission
- [ ] Reviews, stats ("8+ years", "12k setups"), about text, shipping/returns text, showroom address: `messages/en.json` and `messages/ar.json`
- [ ] Locally: delete the hidden old furniture products (the "test" category is already gone)

---

## Phase 5 — Launch checks [You + Claude]

### 14. Before announcing the store
- [ ] Place a real order on a phone (Arabic and English): cart → checkout → confirmation page
- [ ] Admin: confirm → ship → deliver; cancel one and check stock comes back
- [ ] Upload, reorder and delete a product photo; check it appears and disappears in `negm-prod`
- [ ] Test dark mode and 320px-wide phones on the live site
- [ ] **Restore test**: restore a Postgres backup into a scratch database once, so you know it works
- [ ] `https://<domain>/sitemap.xml` and `robots.txt` load; submit the sitemap to Google Search Console

---

## Decided and done

- [x] ~~**Order history photos**: a stored photo is deleted only when no product, category or past order still uses it~~
- [x] ~~**Category photo upload** in the admin category form (pick, preview, save; replacing deletes the old file)~~
- [x] ~~**R2 dev bucket** `negm-dev` with an account API token; all existing photos copied into it and verified~~
- [x] ~~**Products list**: Edit and Delete buttons on every row~~
- [x] ~~**Admin counts** under the Orders, Customers, Products and Categories titles~~
- [x] ~~**Language switch warning** ("Encountered a script tag") fixed~~

## After launch (not blocking)

- [ ] **New-order alerts** (WhatsApp / email). `notifyNewOrder()` is still a no-op, so today the owner must check the admin to see orders. Strongly recommended soon after launch
- [ ] Smaller image sizes (400 / 800 / 1600 px) with `srcset`, so product cards stop downloading 1600px photos
- [ ] Customers CSV export
- [ ] Analytics charts (orders and revenue over time, top sellers, by governorate)
- [ ] Automated tests (order totals, stock, cancel restores stock, admin access)
- [ ] Online payments (Paymob)
- [ ] Clean up abandoned carts older than 30 days

---

## Alternative: photos on the VPS instead of R2

If you skip R2, replace step 9 and the `R2_*` / `MEDIA_BASE_URL` variables with:
- [ ] [Claude] `UPLOAD_DIR` setting in `storage.ts` and a `/media/[...key]` route that serves files from it (rejects `../` paths, one-year cache)
- [ ] [You] Dokploy volume `negm-uploads` mounted at `/app/uploads`; `UPLOAD_DIR=/app/uploads`, `MEDIA_BASE_URL=/media`
- [ ] [You] **Off-server backup of that volume** (provider snapshots, a nightly copy, or Dokploy volume backups). Without it, losing the VPS loses every photo
- [ ] [You] Cloudflare proxy (orange cloud) on the domain so photos are cached and don't load the single CPU
