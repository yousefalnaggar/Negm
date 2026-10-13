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

// Fails fast at startup if something is missing.
export const env = schema.parse(process.env);
