import "server-only";
import { type OrderStatus, Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { normalizeDigits } from "./normalize";

// Filters for the admin orders and customers lists, read from the URL.
// Shared by the pages and their CSV export, so an export always matches the screen.

export const ADMIN_PAGE_SIZE = 24;
export const STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

type Params = Record<string, string | string[] | undefined>;

export function str(v: string | string[] | null | undefined) {
  return typeof v === "string" ? v.trim().slice(0, 100) : "";
}

function pageOf(sp: Params) {
  return Math.max(1, Number(str(sp.page)) || 1);
}

export function readOrderFilters(sp: Params) {
  const status = STATUSES.find((s) => s === str(sp.status));
  const q = normalizeDigits(str(sp.q));
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.from)) ? str(sp.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.to)) ? str(sp.to) : "";

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    };
  }
  if (q) {
    const num = /^#?\d{1,9}$/.test(q) ? Number(q.replace("#", "")) : null;
    where.OR = [
      ...(num !== null ? [{ number: num }] : []),
      { phone: { contains: q.replace(/\D/g, "") || q } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }
  return { status, q: str(sp.q), from, to, page: pageOf(sp), where };
}

export const ORDER_SORT: Prisma.OrderOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "asc" }];

export type CustomerRow = {
  phone: string;
  name: string;
  governorate: string;
  orders: number;
  spent: bigint;
  first: Date;
  last: Date;
};

/** Customers are guests, so they're grouped by phone number across their orders. */
export function readCustomerFilters(sp: Params) {
  const q = normalizeDigits(str(sp.q));
  const digits = q.replace(/\D/g, "");
  const where = q
    ? Prisma.sql`WHERE "customerName" ILIKE ${`%${q}%`} ${digits ? Prisma.sql`OR phone LIKE ${`%${digits}%`}` : Prisma.empty}`
    : Prisma.empty;
  return { q, page: pageOf(sp), where };
}

/** One page of customers, or all of them when `page` is null (exports). */
export function customerRows(where: Prisma.Sql, page: number | null) {
  const limit = page === null ? Prisma.empty : Prisma.sql`LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${(page - 1) * ADMIN_PAGE_SIZE}`;
  return db.$queryRaw<CustomerRow[]>`
    SELECT phone,
      (array_agg("customerName" ORDER BY "createdAt" DESC))[1] AS name,
      (array_agg(governorate ORDER BY "createdAt" DESC))[1] AS governorate,
      COUNT(*)::int AS orders,
      COALESCE(SUM(total) FILTER (WHERE status <> 'CANCELLED'), 0)::bigint AS spent,
      MIN("createdAt") AS first,
      MAX("createdAt") AS last
    FROM "Order" ${where}
    GROUP BY phone
    ORDER BY last DESC, phone
    ${limit}`;
}

export async function customerCount(where: Prisma.Sql) {
  const [{ total }] = await db.$queryRaw<{ total: number }[]>`SELECT COUNT(DISTINCT phone)::int AS total FROM "Order" ${where}`;
  return total;
}
