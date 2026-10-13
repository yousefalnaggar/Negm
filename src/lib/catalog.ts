import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { localName } from "./localized";
import { mediaUrl } from "./media";
import { normalizeSearch } from "./normalize";

export const getCategories = cache(() =>
  db.category.findMany({ orderBy: [{ position: "asc" }, { nameEn: "asc" }] }),
);

const cardInclude = {
  images: { orderBy: { position: "asc" }, take: 1 },
  category: true,
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  price: number;
  compareAtPrice: number | null;
  inStock: boolean;
  image: { url: string; width: number; height: number } | null;
};

function toCard(p: CardRow, locale: string): CardProduct {
  const img = p.images[0];
  return {
    id: p.id,
    slug: p.slug,
    name: localName(p, locale),
    category: p.category ? localName(p.category, locale) : null,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    inStock: p.stock > 0,
    image: img ? { url: mediaUrl(img.key)!, width: img.width, height: img.height } : null,
  };
}

export const SORTS = ["featured", "newest", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];

const ORDER_BY: Record<Sort, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ featured: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
};

export async function listProducts(
  locale: string,
  opts: {
    categoryId?: string;
    q?: string;
    featured?: boolean;
    take?: number;
    excludeId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: Sort;
  } = {},
) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.categoryId) where.categoryId = opts.categoryId;
  if (opts.featured) where.featured = true;
  if (opts.excludeId) where.id = { not: opts.excludeId };
  if (opts.inStock) where.stock = { gt: 0 };
  if (opts.minPrice !== undefined || opts.maxPrice !== undefined) {
    where.price = { gte: opts.minPrice, lte: opts.maxPrice };
  }
  if (opts.q) {
    const q = normalizeSearch(opts.q);
    if (q) where.searchText = { contains: q, mode: "insensitive" };
  }
  const rows = await db.product.findMany({
    where,
    include: cardInclude,
    orderBy: ORDER_BY[opts.sort ?? "featured"],
    take: opts.take ?? 60,
  });
  // Out-of-stock pieces sink to the end (stable sort keeps the chosen order otherwise).
  return rows.map((r) => toCard(r, locale)).sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

/** Cheapest and most expensive visible product, in piasters (for the price filter hints). */
export async function getPriceBounds() {
  const { _min, _max } = await db.product.aggregate({ where: { active: true }, _min: { price: true }, _max: { price: true } });
  return { min: _min.price ?? 0, max: _max.price ?? 0 };
}

/** Categories with how many visible products each has (home page tiles). */
export async function getCategoriesWithCounts() {
  return db.category.findMany({
    orderBy: [{ position: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
}
