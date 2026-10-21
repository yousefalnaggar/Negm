// The shop's filters as they appear in the URL (/shop?category=…&min=…&sort=…).
// Shared by the shop page (server) and its controls (client), so links always match.
import { normalizeDigits } from "./normalize";

export const SORTS = ["featured", "newest", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];

export type ShopQuery = {
  q: string;
  category: string; // slug, "" for all
  min?: number; // whole pounds
  max?: number;
  stock: boolean;
  sale: boolean;
  sort: Sort;
};

/** Ready-made price ranges in whole pounds. */
export const PRICE_RANGES: { min?: number; max?: number }[] = [
  { max: 3000 },
  { min: 3000, max: 6000 },
  { min: 6000, max: 10000 },
  { min: 10000, max: 20000 },
  { min: 20000 },
];

type Params = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim().slice(0, 100) : "";
}

/** Whole pounds from user input, or undefined when empty or not a number. */
export function pounds(v: string | string[] | undefined) {
  const s = normalizeDigits(str(v)).replace(/[,\s]/g, "");
  return /^\d{1,7}$/.test(s) ? Number(s) : undefined;
}

export function parseShopQuery(sp: Params) {
  let min = pounds(sp.min);
  let max = pounds(sp.max);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  const query: ShopQuery = {
    q: str(sp.q),
    category: str(sp.category),
    min,
    max,
    stock: str(sp.stock) === "1",
    sale: str(sp.sale) === "1",
    sort: SORTS.find((s) => s === str(sp.sort)) ?? "featured",
  };
  return { query, page: Math.max(1, Number(normalizeDigits(str(sp.page))) || 1) };
}

/** The URL for a set of filters. Changing filters goes back to page 1. */
export function shopHref(query: ShopQuery, page = 1) {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.category) p.set("category", query.category);
  if (query.min !== undefined) p.set("min", String(query.min));
  if (query.max !== undefined) p.set("max", String(query.max));
  if (query.stock) p.set("stock", "1");
  if (query.sale) p.set("sale", "1");
  if (query.sort !== "featured") p.set("sort", query.sort);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/shop${s ? `?${s}` : ""}`;
}

/** The same filters with nothing narrowing the results (the sort is kept). */
export function clearFilters(query: ShopQuery): ShopQuery {
  return { ...query, q: "", category: "", min: undefined, max: undefined, stock: false, sale: false };
}
