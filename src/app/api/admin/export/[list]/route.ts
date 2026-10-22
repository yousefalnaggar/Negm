import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ADMIN_PAGE_SIZE, customerRows, ORDER_SORT, readCustomerFilters, readOrderFilters } from "@/lib/admin-lists";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { governorateName } from "@/lib/governorates";
import { localName } from "@/lib/localized";

/**
 * CSV export of the admin orders or customers list, with the same filters as the page.
 * `scope=page` exports the page on screen (24 rows), `scope=all` every matching row.
 * UTF-8 with a BOM so Excel shows Arabic correctly.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/admin/export/[list]">) {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });

  const { list } = await params;
  if (list !== "orders" && list !== "customers") return new Response("Not found", { status: 404 });

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const locale = routing.locales.find((l) => l === sp.locale) ?? routing.defaultLocale;
  const onePage = sp.scope === "page";
  const t = await getTranslations({ locale, namespace: "admin.export" });

  let rows: Cell[][];
  let page: number;
  if (list === "orders") {
    const f = readOrderFilters(sp);
    page = f.page;
    const tStatus = await getTranslations({ locale, namespace: "status" });
    const orders = await db.order.findMany({
      where: f.where,
      orderBy: ORDER_SORT,
      include: { items: true },
      ...(onePage ? { skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE } : {}),
    });
    rows = [
      [t("number"), t("date"), t("status"), t("customer"), t("phone"), t("email"), t("governorate"), t("city"), t("address"), t("notes"), t("items"), t("subtotal"), t("shipping"), t("total")],
      ...orders.map((o) => [
        String(o.number),
        dateTime(o.createdAt),
        tStatus(o.status),
        o.customerName,
        phone(o.phone),
        o.email ?? "",
        governorateName(o.governorate, locale),
        o.city,
        o.address,
        o.notes ?? "",
        o.items.map((i) => `${localName(i, locale)} × ${i.quantity}`).join("; "),
        pounds(o.subtotal),
        pounds(o.shippingFee),
        pounds(o.total),
      ]),
    ];
  } else {
    const f = readCustomerFilters(sp);
    page = f.page;
    const customers = await customerRows(f.where, onePage ? page : null);
    rows = [
      [t("customer"), t("phone"), t("governorate"), t("orders"), t("spent"), t("firstOrder"), t("lastOrder")],
      ...customers.map((c) => [
        c.name,
        phone(c.phone),
        governorateName(c.governorate, locale),
        String(c.orders),
        pounds(Number(c.spent)),
        dateTime(c.first),
        dateTime(c.last),
      ]),
    ];
  }

  const filename = `${list}-${dateTime(new Date()).slice(0, 10)}${onePage ? `-page-${page}` : ""}.csv`;
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** A plain value, or a formula we build ourselves (never from user input). */
type Cell = string | { formula: string };

/** Quoted CSV cell. Text that Excel would run as a formula (=, +, -, @) gets a leading apostrophe. */
function cell(value: Cell) {
  const text = typeof value === "string" ? (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value) : value.formula;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Excel drops the leading 0 of 01012345678 unless the cell is a text formula. Only plain digits get one. */
function phone(value: string): Cell {
  return /^\d+$/.test(value) ? { formula: `="${value}"` } : value;
}

/** Piasters → plain pounds ("4500" or "4500.5"), so the column stays numeric in Excel. */
function pounds(piasters: number) {
  return String(piasters / 100);
}

/** "2026-10-19 20:29" */
function dateTime(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
