import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: { role: { type: "string", input: false, defaultValue: "admin" } },
  },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  advanced: { useSecureCookies: env.NODE_ENV === "production" },
  plugins: [nextCookies()],
});

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

/** Call at the top of every admin page and admin Server Action. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) return redirect({ href: "/admin/login", locale: await getLocale() });
  return session;
}
