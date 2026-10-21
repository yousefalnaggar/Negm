import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { searchSuggestions } from "@/lib/catalog";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Live suggestions for the header search, as the visitor types. */
export async function GET(request: NextRequest) {
  if (!rateLimit(`search:${await clientIp()}`, 120, 60_000)) {
    return Response.json({ error: "rateLimited" }, { status: 429 });
  }
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const locale = routing.locales.find((l) => l === params.get("locale")) ?? routing.defaultLocale;
  return Response.json(await searchSuggestions(locale, q));
}
