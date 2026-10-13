import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  const paths: { path: string; lastModified?: Date }[] = [
    { path: "" },
    { path: "/shop" },
    { path: "/about" },
    { path: "/contact" },
    { path: "/services" },
    { path: "/shipping" },
    ...products.map((p) => ({ path: `/product/${p.slug}`, lastModified: p.updatedAt })),
  ];
  const url = (locale: string, path: string) => `${env.SITE_URL}/${locale}${path}`;
  return paths.map(({ path, lastModified }) => ({
    url: url(routing.defaultLocale, path),
    lastModified,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, url(l, path)])) },
  }));
}
