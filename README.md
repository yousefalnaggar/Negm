# Bilingual E-commerce Platform

A complete online store you can reuse for many shops: a customer-facing storefront and an admin dashboard in one Next.js app, backed by PostgreSQL. Arabic (right-to-left) and English, light and dark themes, and cash on delivery. It is built to look good and work on every screen, down to 320px phones.

The first store built on it is **NEGM (نجم)**, an office and gaming furniture shop in Egypt. Everything specific to a store (name, colors, texts, photos, catalogue, market rules) lives in a few known places, listed in [Starting a new store](#starting-a-new-store).

---

## Features

### Storefront

- **Home page:** hero, featured products, categories with photos and product counts, customer reviews slider, partner logos, an about section with stats, and WhatsApp contact buttons.
- **Shop:**
  - category chips with live counts;
  - a price menu (ready ranges plus a custom range), **In stock** and **On sale** toggles, and sort (featured, newest, price up or down);
  - active filters shown as removable chips, with **Clear all**;
  - numbered pages, 24 products per page. Sold-out items always come last.
  - Every filter applies instantly and lives in the URL, so any view can be shared or bookmarked.
- **Phone filters:** a bottom sheet that applies as you tap and shows the live result count ("Show 34 pieces").
- **Search everywhere:**
  - a header search on every page, opened with `/` or `Ctrl+K`;
  - live suggestions while typing: products with photo and price, matching categories, and "See all results";
  - full keyboard support;
  - words match in any order, and Arabic spelling variants (أ/إ/ا, ة/ه, ى/ي, diacritics, Arabic-Indic digits) are normalized.
- **Product page:** photo gallery (up to 10 photos), price with crossed-out compare-at price, stock status, quantity picker, and related products.
- **Cart:** works for guests with no account (cookie-based). Prices always come from the database.
- **Checkout:** cash on delivery, with a governorate list and mobile number validation. Double-submits are blocked, so one click creates one order.
- **Order tracking:** after checkout the customer gets a private link to their order's status.
- **Content pages:** About, Services, Contact, Shipping & Returns.
- **Bilingual:** Arabic (default) and English. The language switch keeps you on the same page, and every product and category has names in both languages.
- **Dark mode** and a responsive layout. Nothing scrolls sideways on any screen.
- **SEO:** per-page titles and descriptions, Open Graph images, `sitemap.xml` and `robots.txt`.

### Admin dashboard (`/admin`)

- **Dashboard:** new orders, 30-day revenue, average order value, recent orders, and low-stock alerts.
- **Orders:**
  - filter by status, date range, or search (order number, phone or name);
  - move orders New → Confirmed → Shipped → Delivered. Cancelling puts the items back in stock;
  - printable packing slip.
- **Customers:** grouped by phone number, with order count, first and last order, and total spent.
- **Products:**
  - create, edit, hide or delete; featured flag, compare-at price and stock;
  - up to 10 photos per product: upload several at once, reorder, delete. The first photo is the main one.
- **Categories:** names in both languages, URL slug, photo, and product count.
- **Settings:** store name (AR/EN), phone number (used by every WhatsApp button) and shipping fee.
- **Lists:**
  - search applies as you type, and **Clear filters** resets everything;
  - numbered pages;
  - tables turn into stacked cards on phones.
- **Admin accounts:** email and password sign-in, with sign-up disabled. Every admin page and action checks the session on the server.

### Under the hood

- **Money** is stored as whole integers in the smallest unit (piasters), and formatted only for display.
- **Totals are recomputed on the server** from database prices. Checkout reduces stock and creates the order in one transaction, so two people can't buy the last item.
- **Order history stays intact:** each order line keeps the product name and photo at the time of purchase, so editing or deleting a product never changes past orders. Photos still used by an order are never deleted.
- **Images** are auto-rotated, stripped of metadata, converted to WebP and limited to 1600px with `sharp`. They are stored in Cloudflare R2 (or a local folder in development), and the database keeps only file keys.
- **Rate limits** on login, cart, checkout and search.
- **Security headers:** `nosniff`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.
- **No N+1 queries:** every page runs a fixed number of database queries, run in parallel where possible.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| UI | React 19, Tailwind CSS 4, lucide icons, next-themes (dark mode) |
| Languages | next-intl 4 (`/ar` and `/en` URLs, ICU plurals including Arabic) |
| Database | PostgreSQL 18 with Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Better Auth (email and password) |
| Validation | Zod 4 |
| Images | sharp, Cloudflare R2 through the S3 API |
| Production | Docker image (Next.js standalone build), designed for a VPS with Dokploy |

---

## Getting started (development)

Requirements: **Node 20.9+** and **Docker Desktop**.

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then fill in the values (see below)
npm run db:up               # Postgres in Docker on localhost:5434
npm run db:migrate          # create the tables
npm run db:seed             # settings, a demo catalogue with photos, and the first admin
npm run dev                 # http://localhost:3000
```

- Store: http://localhost:3000 (redirects to `/ar`; `/en` for English)
- Admin: http://localhost:3000/ar/admin, signing in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`

The seed is safe to run again: it never overwrites existing rows.

To try paging and filters with plenty of data, `npx tsx scripts/fake-data.ts` adds 100 products, customers and orders, and `npx tsx scripts/fake-data.ts --clean` removes them.

### Environment variables

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters (the command to make one is in `.env.example`) |
| `BETTER_AUTH_URL`, `SITE_URL` | The site's public address, e.g. `https://example.com` |
| `MEDIA_BASE_URL` | Where photos are served from: `/uploads` locally, or the R2 bucket's public URL |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare R2. Leave all four empty to store photos in `public/uploads` (development only) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used once by the seed to create the first admin. Remove the password afterwards |

The app checks these when it starts and stops with a clear error if one is missing.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run db:up` | Start the development Postgres container |
| `npm run db:migrate` | Create and apply a migration after changing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Demo data and the first admin |
| `npx prisma studio` | Browse and edit the database at http://localhost:5555 |

---

## Starting a new store

Each store is its own deployment of this code, with its own database, photo bucket, domain and secrets. To set up a new one:

1. **Name, phone, shipping fee:** in **Admin → Settings**. The first values come from `prisma/seed.ts`.
2. **Colors:** the light and dark color tokens at the top of `src/app/globals.css` (`--accent`, `--ink`, `--bg`…). Every component uses these tokens.
3. **Fonts:** `src/app/[locale]/layout.tsx` (one Latin and one Arabic font, for body text and headings).
4. **Texts:** `messages/ar.json` and `messages/en.json` hold every word in the store and the admin:
   - the home page copy, top bar promises, review texts and stats;
   - the About, Services, Contact and Shipping pages.
5. **Home page images:** `public/images/hero.webp`, `public/images/about.webp`, the review photos in `public/images/reviews/`, and the partner logos in `public/partners/`. The partner names are listed in `src/app/[locale]/(store)/page.tsx`.
6. **Catalogue:** add categories and products in the admin, or replace the demo data in `prisma/seed-data.ts`.
7. **Market rules** (when the store isn't in Egypt):

   | Rule | File |
   | --- | --- |
   | Regions list | `src/lib/governorates.ts` |
   | Mobile number format (`EGYPT_MOBILE`) and the WhatsApp country code | `src/lib/normalize.ts` |
   | Currency formatting | `src/lib/money.ts` |
   | Shop price ranges (`PRICE_RANGES`) | `src/lib/shop-query.ts` |
   | Languages and the default one | `src/i18n/routing.ts` |

8. **Favicon:** `src/app/favicon.ico`.

---

## Project structure

```
messages/{ar,en}.json        every UI string (storefront + admin)
prisma/schema.prisma         data model; prisma/migrations holds the versioned migrations
prisma/seed.ts, seed-data.ts settings, demo catalogue, first admin
src/proxy.ts                 language routing (/ar, /en)
src/app/[locale]/(store)/    storefront pages
src/app/[locale]/admin/      admin: login and the (panel) pages
src/app/api/                 health check and search suggestions
src/actions/                 Server Actions: cart, checkout, admin
src/components/              UI; src/components/admin/ for the dashboard
src/lib/                     database, auth, catalogue, cart, orders, storage, validation, helpers
scripts/fake-data.ts         test data for development
Dockerfile                   production image
```

---

## Production

The `Dockerfile` builds one image containing the whole app, storefront and admin together:

```bash
docker build -t store .
docker run -p 3000:3000 --env-file prod.env store
```

- **Migrations** run when the container starts (`prisma migrate deploy`); this is a no-op when the database is already up to date.
- **No secrets in the image:** they come from the environment when the container starts.
- **Health check:** `/api/health` reports whether the database is reachable.
- **Database:** Postgres runs as a separate service with its own volume and backups. Photos live in R2, so the app container can be replaced on every deploy without losing anything.

The intended setup is a VPS running Dokploy, with GitHub Actions building the image and Cloudflare in front for DNS and the photo CDN.

---

## Roadmap

- New-order alerts by WhatsApp or email (`src/lib/notify.ts` is the hook, not wired yet)
- Online payments (e.g. Paymob) alongside cash on delivery
- Smaller image sizes with `srcset`
- Analytics charts, customers CSV export
- Content-Security-Policy and HSTS headers
- Automated tests
- A production seed that creates only the settings and the first admin
