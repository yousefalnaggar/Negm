# syntax=docker/dockerfile:1
# Production image: Next.js standalone server, plus the Prisma CLI to apply migrations on start.
#   docker build -t negm-store .
#   docker run -p 3000:3000 --env-file prod.env negm-store
# Secrets are never baked in; they come from the environment when the container starts.

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma's migration engine needs OpenSSL, which the slim image doesn't include.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# 1. All dependencies (dev ones are needed to build). The Prisma files are copied first
#    because `npm ci` runs the postinstall `prisma generate`.
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# 2. Build the app into .next/standalone.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Prisma CLI for `migrate deploy`, at the same version as the app, kept apart from the
#    app's own trimmed node_modules.
FROM base AS migrator
WORKDIR /migrate
COPY package-lock.json /tmp/
# A package.json with the locked versions; allowScripts lets Prisma fetch its engine on install.
RUN node <<'EOF'
const l = require("/tmp/package-lock.json").packages;
const v = (name) => l["node_modules/" + name].version;
require("fs").writeFileSync("package.json", JSON.stringify({
  private: true,
  dependencies: { prisma: v("prisma"), dotenv: v("dotenv") },
  allowScripts: { [`prisma@${v("prisma")}`]: true, [`@prisma/engines@${v("@prisma/engines")}`]: true },
}));
EOF
RUN npm install --omit=dev --no-audit --no-fund
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/
COPY prisma/migrations ./prisma/migrations

# 4. Final image: only what's needed to run.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=migrator --chown=node:node /migrate ./migrate
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# Apply pending migrations (no-op when up to date), then start the server.
CMD ["sh", "-c", "cd migrate && ./node_modules/.bin/prisma migrate deploy && cd .. && exec node server.js"]
