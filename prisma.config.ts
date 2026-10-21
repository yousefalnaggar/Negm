import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Not env("DATABASE_URL"): that throws when it's unset, and `prisma generate` runs during
  // the Docker build where no database secrets exist. Commands that connect still need it.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
