import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { localName } from "./localized";
import { mediaUrl } from "./media";
import { normalizeSearch } from "./normalize";
import type { Sort } from "./shop-query";

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

// `id` last breaks ties (e.g. same price), so pages never repeat or skip a product.
const ORDER_BY: Record<Sort, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ featured: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  "price-asc": [{ price: "asc" }, { id: "asc" }],
  "price-desc": [{ price: "desc" }, { id: "asc" }],
};

type ProductFilters = {
  categoryId?: string;
  q?: string;
  featured?: boolean;
  excludeId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: Sort;
};

/** Search words, normalized the same way as Product.searchText. */
function searchWords(q: string) {
  return normalizeSearch(q).split(" ").filter(Boolean);
}

/** Every word must match, in any order: "chair black" finds "Black Office Chair". */
export function matchSearchText(q: string): Prisma.ProductWhereInput {
  const words = searchWords(q);
  return words.length ? { AND: words.map((w) => ({ searchText: { contains: w, mode: "insensitive" as const } })) } : {};
}

function productWhere(opts: ProductFilters) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.categoryId) where.categoryId = opts.categoryId;
  if (opts.featured) where.featured = true;
  if (opts.excludeId) where.id = { not: opts.excludeId };
  if (opts.inStock) where.stock = { gt: 0 };
  if (opts.onSale) where.compareAtPrice = { gt: db.product.fields.price };
  if (opts.minPrice !== undefined || opts.maxPrice !== undefined) {
    where.price = { gte: opts.minPrice, lte: opts.maxPrice };
  }
  return { ...where, ...matchSearchText(opts.q ?? "") };
}

/** A short list (home page, related pieces). */
export async function listProducts(locale: string, opts: ProductFilters & { take: number }) {
  const rows = await db.product.findMany({
    where: productWhere(opts),
    include: cardInclude,
    orderBy: ORDER_BY[opts.sort ?? "featured"],
    take: opts.take,
  });
  // Out-of-stock pieces sink to the end (stable sort keeps the chosen order otherwise).
  return rows.map((r) => toCard(r, locale)).sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

/**
 * One page of the shop, plus the total. Out-of-stock pieces come after all in-stock ones,
 * so the page is cut from the in-stock rows first, then from the out-of-stock rows.
 */
export async function pageProducts(locale: string, opts: ProductFilters, page: number, pageSize: number) {
  const where = productWhere(opts);
  const available = { AND: [where, { stock: { gt: 0 } }] };
  const soldOut = { AND: [where, { stock: { lte: 0 } }] };
  const [total, availableCount] = await Promise.all([db.product.count({ where }), db.product.count({ where: available })]);

  const skip = (page - 1) * pageSize;
  const fromAvailable = Math.max(0, Math.min(availableCount - skip, pageSize));
  const query = { include: cardInclude, orderBy: ORDER_BY[opts.sort ?? "featured"] };
  const [first, rest] = await Promise.all([
    fromAvailable > 0 ? db.product.findMany({ ...query, where: available, skip, take: fromAvailable }) : [],
    fromAvailable < pageSize
      ? db.product.findMany({ ...query, where: soldOut, skip: Math.max(0, skip - availableCount), take: pageSize - fromAvailable })
      : [],
  ]);
  return { products: [...first, ...rest].map((r) => toCard(r, locale)), total };
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

/**
 * How many pieces each category would show with the other filters kept,
 * for the counts on the shop's category chips. Keyed by category id.
 */
export async function categoryCounts(opts: ProductFilters) {
  const groups = await db.product.groupBy({
    by: ["categoryId"],
    where: productWhere({ ...opts, categoryId: undefined }),
    _count: true,
  });
  return new Map(groups.map((g) => [g.categoryId, g._count]));
}

/** Header search: a few matching pieces and categories, and how many pieces match in all. */
export async function searchSuggestions(locale: string, q: string) {
  const words = searchWords(q);
  if (!words.length) return { products: [], categories: [], total: 0 };
  const [products, total, categories] = await Promise.all([
    listProducts(locale, { q, take: 6 }),
    db.product.count({ where: productWhere({ q }) }),
    getCategories(),
  ]);
  return {
    products,
    total,
    categories: categories
      .filter((c) => {
        const text = normalizeSearch(`${c.nameAr} ${c.nameEn}`);
        return words.every((w) => text.includes(w));
      })
      .map((c) => ({ slug: c.slug, name: localName(c, locale) })),
  };
}

export type SearchSuggestions = Awaited<ReturnType<typeof searchSuggestions>>;
