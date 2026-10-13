# Bayt — bilingual furniture store

Next.js 16 (App Router) + Prisma 7 + PostgreSQL. Arabic (default, RTL) and English, light and dark themes, guest cart, cash-on-delivery checkout and an admin dashboard.

## Local development

Requirements: Node 20.9+, Docker Desktop.

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then fill in BETTER_AUTH_SECRET and ADMIN_PASSWORD
npm run db:up               # Postgres 18 on localhost:5434 (docker-compose.dev.yml)
npm run db:migrate          # apply migrations
npm run db:seed             # settings, demo catalog with photos, first admin
npm run dev                 # http://localhost:3000
```

- Store: http://localhost:3000 (redirects to `/ar`; `/en` for English)
- Admin: http://localhost:3000/ar/admin, signing in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`

The seed is idempotent: it never overwrites existing rows, and it creates the admin only if that email doesn't exist yet.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run db:migrate` | Create/apply a migration in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Seed data and first admin |

## How it fits together

```
messages/{ar,en}.json        all UI strings (storefront + admin)
prisma/schema.prisma         data model; prisma/migrations is versioned
src/proxy.ts                 locale routing (next-intl)
src/app/[locale]/(store)/    storefront pages
src/app/[locale]/admin/      admin (login + (panel) pages)
src/actions/                 Server Actions: cart, checkout, admin
src/lib/                     db, auth, cart, orders, validation, storage, helpers
```

- **Money** is stored as integer piasters and formatted with `Intl` only for display.
- **Prices and totals** are always recomputed from the database. Checkout decrements stock and creates the order in one transaction, guarded by an idempotency key.
- **Bilingual content** uses `nameAr`/`nameEn`/`descriptionAr`/`descriptionEn` columns. Descriptions fall back to the other language when one is empty.
- **Search** matches a normalized `searchText` column (Arabic diacritics stripped, alef/ya/ta-marbuta unified).
- **Images** are processed with `sharp` (EXIF rotate, metadata stripped, WebP, at most 1600px). The database stores only object keys, and `MEDIA_BASE_URL` turns them into URLs. In development, files go to `public/uploads`. For production, swap `putObject`/`deleteObject` in `src/lib/storage.ts` for Cloudflare R2 and point `MEDIA_BASE_URL` at the CDN domain.
- **Admin auth** uses Better Auth (email + password, sign-up disabled). Every admin page and Server Action calls `requireAdmin()` on the server.

## Not built yet

These are planned in the full spec but not in this first development cut: R2 upload and three image sizes, analytics charts, customers page and CSV export, CSP header, unit tests, and the Docker/Caddy production setup with backups.
