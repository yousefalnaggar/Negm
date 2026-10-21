import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SITE_URL: z.url(),
  MEDIA_BASE_URL: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// `next build` loads server modules to prepare pages, but secrets only exist where the app
// runs (the Docker build has none). So the check is skipped during the build and runs when
// the server starts, failing fast if something is missing.
// The placeholders only keep libraries (Better Auth) from logging errors while building;
// they never serve a request, because the server parses the real environment on start.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";
export const env = isBuild
  ? schema.parse({
      DATABASE_URL: "postgresql://build",
      BETTER_AUTH_SECRET: "build-time-placeholder-never-used-at-runtime",
      BETTER_AUTH_URL: "http://localhost",
      SITE_URL: "http://localhost",
      MEDIA_BASE_URL: "/uploads",
      ...process.env,
    })
  : schema.parse(process.env);
