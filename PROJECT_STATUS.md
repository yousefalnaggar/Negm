# Project status: NEGM office & gaming furniture store

_Last updated: 2026-10-11 (first development build)_

## Where to see everything (dev)

| What | URL | Notes |
| --- | --- | --- |
| Store (Arabic, default) | http://localhost:3000/ar | `/` redirects here |
| Store (English) | http://localhost:3000/en | Language switch in the header keeps the current page |
| Admin dashboard | http://localhost:3000/ar/admin (or `/en/admin`) | Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` |
| Database UI (Prisma Studio) | http://localhost:5555 | Start with `npx prisma studio`. Browse and edit every table. |
| Database (direct) | `postgresql://store:store_dev_password@localhost:5434/store` | Works in any SQL client (TablePlus, DBeaver, pgAdmin). Docker container `store-db-1`. |
| Health check | http://localhost:3000/api/health | Returns `{"status":"ok"}` when the DB is reachable |

To start everything after a reboot:

```bash
npm run db:up        # Postgres in Docker (Docker Desktop must be running, not paused)
npm run dev          # http://localhost:3000
npx prisma studio    # optional: http://localhost:5555
```

## Done ✅

### Storefront (Arabic RTL + English LTR)
- Identity: office and gaming furniture. Electric blue + lime palette, Bricolage Grotesque / Alexandria headings, Manrope / Tajawal body
- Home: full-screen hero (photo under a 70% black overlay, two CTAs: shop and WhatsApp), customer favourites, category tiles with product counts and hover animation (each opens the shop filtered to it), trusted-partners logo marquee, reviews slider (5 photos, autoplay), short about block
- Motion: page fade-in on every store page, staggered scroll reveals (`<Reveal>`), hover lift on product cards; all of it turns off with "reduce motion"
- Placeholders to replace: partner logos in `public/partners/*.svg` (made-up companies) and the names in `src/app/[locale]/(store)/page.tsx`; reviews, stats and about copy in `messages/*.json`; photos in `public/images`
- Navbar: Home, Products, Services, About, and Contact us (opens WhatsApp with the store phone from Settings). Language (flag + EN/AR) and theme buttons stay visible on every width; below 1024px the links move into a slide-in drawer
- Responsive down to 320px wide (checked for horizontal overflow on every store and admin page)
- Home (hero, delivery/COD promises, shop-by-room, featured products, story band) and product pages with an uncropped gallery and related items
- Products page with a filter sidebar (search, category, price range, in stock only, sort); filters live in the URL, and on mobile they fold behind a Filters button
- Services, About, Contact, Shipping & Returns pages; localized 404 and error pages
- Light theme by default plus dark mode (next-themes) with a header toggle
- Fonts are self-hosted via `next/font`: Fraunces + Manrope for English, Amiri headings + Tajawal for Arabic
- Every UI string lives in `messages/ar.json` / `messages/en.json`, Zod errors included
- Prices are stored as integer piasters and formatted with `Intl` (EGP, Western digits)
- Arabic search normalization (diacritics, alef/ya/ta-marbuta variants)
- SEO basics: per-page titles, hreflang via next-intl, `robots.txt`, localized `sitemap.xml`

### Cart and checkout
- Guest cart in the database, tied to an httpOnly, sameSite=lax cookie holding a random token (secure in production)
- Add, update and remove items; prices always read from the database; stock limits enforced
- Cash-on-delivery checkout: Egyptian mobile validation (accepts Arabic-Indic digits and +20), governorate list (27), honeypot field, rate limiting
- Order creation and stock decrement happen in **one transaction**, with an idempotency key so double-clicks can't create two orders
- The confirmation page uses an unguessable public token, not the order number
- Orders keep their own snapshots (names, price, image), so later product edits don't change past orders

### Admin (bilingual)
- Login with Better Auth (email + password, sign-up disabled, generic errors, throttling per IP and per account)
- Every admin page **and** every admin Server Action checks the session on the server
- Dashboard: new orders, 30-day revenue, order count, average order, recent orders, low stock
- Orders: status tabs, search (number/phone/name), date range, pagination, detail page, status flow `NEW → CONFIRMED → SHIPPED → DELIVERED` plus `CANCELLED` (restores stock), printable packing slip
- Products: list and search, create and edit with Arabic and English side by side, price, compare-at price, stock, category, visible/featured flags, delete
- Images: upload (sharp: real content check, 50 MP limit, EXIF rotate, metadata stripped, WebP ≤1600px), reorder, delete, max 10. The DB stores **keys only**.
- Customers: guests grouped by phone, with order count, total spent (cancelled orders excluded), first/last order and a link to their orders
- Stock field: digits only, with −/+ buttons
- Categories (add, edit, delete) and Settings (bilingual store name, phone, flat shipping fee)

### Quality checks run
- `tsc` ✅, `eslint` ✅, `next build` ✅
- End-to-end browser test of the full flow ✅: add to cart, validation errors, order with Arabic digits, admin login (bad and good), status change, cancel restores stock, image upload and delete
- `npm audit`: the remaining 5 "high" findings all come from one `braces` advisory inside ESLint (dev only, no fix published yet). The `mysql2` / `deepmerge-ts` findings are fixed with `overrides`.

## Left for production ⏳

Ordered by priority. Items marked **must** block launch.

### 1. Images on Cloudflare R2 (must)
- [ ] Replace `putObject` / `deleteObject` in `src/lib/storage.ts` with `@aws-sdk/client-s3` (R2 endpoint), with `Content-Type: image/webp` and `Cache-Control: public, max-age=31536000, immutable`
- [ ] Generate three sizes (400w / 800w / 1600w) and use `srcset` / `sizes` on product images
- [ ] Set `MEDIA_BASE_URL=https://cdn.<domain>` (custom domain on the bucket, not `r2.dev`)
- [ ] Add MinIO to `docker-compose.dev.yml` so dev uses the same S3 code path
- [ ] Move the seed photos to R2 (they're currently in `public/uploads/seed`)
- Reason: `next start` does not serve files added to `public/` after the build, so local-disk uploads won't show in production.

### 2. Deployment files (must)
- [ ] `Dockerfile` (multi-stage, `output: "standalone"`, non-root user, sharp working)
- [ ] `docker-compose.yml` with `app` + `db` (Postgres, named volume, **not exposed**) + `caddy`
- [ ] `Caddyfile` (domain from env, automatic HTTPS, compression, long cache for `/_next/static`)
- [ ] Run `prisma migrate deploy` on each deploy (never `migrate dev`)
- [ ] `scripts/deploy.sh` (git pull, build, migrate, restart)
- [ ] `DEPLOYMENT.md`: VPS hardening (non-root user, SSH keys only, UFW 22/80/443, fail2ban), Docker install, `.env`, DNS, R2 setup, Cloudflare billing alert

### 3. Security hardening (must)
- [ ] Content-Security-Policy header (`img-src 'self' data: https://cdn.<domain>`, `frame-ancestors 'none'`) and HSTS (via Caddy or `next.config.ts`)
- [ ] Production `.env` with a fresh `BETTER_AUTH_SECRET`, a strong `ADMIN_PASSWORD` (remove it from `.env` after seeding), `BETTER_AUTH_URL` / `SITE_URL` set to the real domain
- [ ] Make sure Caddy forwards `X-Forwarded-For` (the rate limiter trusts only the **last** entry)
- [ ] Change the seeded demo admin email (`admin@example.com`) to a real one

### 4. Backups (must)
- [ ] `scripts/backup.sh`: compressed, timestamped `pg_dump`, 14-day retention, cron example
- [ ] Off-server copies to a private R2/B2 bucket with `rclone`, plus a tested restore procedure

### 5. Content (must)
- [ ] Replace demo products, photos (Unsplash), partner logos, reviews, stats, prices, phone number and showroom address with real data
- [ ] Review the About / Shipping / Contact copy in `messages/*.json`

### 6. Spec features not built yet (should)
- [ ] CSV export (UTF-8 BOM) for the customers page
- [ ] Analytics: range picker (today / 7 / 30 / custom), orders and revenue chart, top sellers, orders by status and governorate, new vs returning customers
- [ ] Bilingual static pages and settings editable from the admin (currently in `messages/*.json`)
- [ ] Per-page canonical URLs

### 7. Tests (should)
- [ ] Unit tests for: totals, order transaction and stock decrement, cancel restores stock, admin authorization, Arabic digit/phone normalization, search normalization, image pipeline
- [ ] Turn the ad-hoc e2e browser check into a committed test (e.g. Playwright)

### 8. Nice to have (later)
- [ ] `notifyNewOrder()` (currently a no-op): WhatsApp, SMS or email alerts for new orders
- [ ] Online payments (Paymob); the order model already separates `paymentMethod`
- [ ] Clean up abandoned carts older than 30 days (a small cron query)

## Known issues (dev machine only)

- **OneDrive locks `.next` files.** The project is inside a OneDrive-synced folder, so Next.js sometimes logs `EPERM: operation not permitted, rename …` and a page's first load returns 500. Reloading fixes it. Permanent fix: move the project out of OneDrive (e.g. `C:\dev\store`) or pause OneDrive sync while developing. This doesn't affect production.
- Rate limits live in memory and reset when the server restarts. That's fine for one VPS process.
