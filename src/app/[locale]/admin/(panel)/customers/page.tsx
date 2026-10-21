import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/ui";
import { Pagination } from "@/components/pagination";
import { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { governorateName } from "@/lib/governorates";
import { formatDate, formatPrice } from "@/lib/money";
import { normalizeDigits } from "@/lib/normalize";

const PAGE_SIZE = 24;

type CustomerRow = {
  phone: string;
  name: string;
  governorate: string;
  orders: number;
  spent: bigint;
  first: Date;
  last: Date;
};

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim().slice(0, 100) : "";
}

/** Customers are guests, so they're grouped by phone number across their orders. */
export default async function CustomersPage({ params, searchParams }: PageProps<"/[locale]/admin/customers">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();

  const sp = await searchParams;
  const q = normalizeDigits(str(sp.q));
  const page = Math.max(1, Number(str(sp.page)) || 1);
  const digits = q.replace(/\D/g, "");
  const where = q
    ? Prisma.sql`WHERE "customerName" ILIKE ${`%${q}%`} ${digits ? Prisma.sql`OR phone LIKE ${`%${digits}%`}` : Prisma.empty}`
    : Prisma.empty;

  const [t, tAdmin, rows, [{ total }]] = await Promise.all([
    getTranslations("admin.customersPage"),
    getTranslations("admin"),
    db.$queryRaw<CustomerRow[]>`
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
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ total: number }[]>`SELECT COUNT(DISTINCT phone)::int AS total FROM "Order" ${where}`,
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const s = new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title={tAdmin("customers")} count={tAdmin("counts.customers", { count: total })} />

      <ListFilters placeholder={t("search")}>
        <div className="card">
          <table className="table-cards w-full text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("orders")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("firstOrder")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("lastOrder")}</th>
                <th className="px-4 py-3 text-end font-medium" title={t("spentHint")}>{t("spent")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.phone} className="hover:bg-sunken/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted">
                      <a href={`tel:${c.phone}`} dir="ltr" className="hover:text-accent">{c.phone}</a> · {governorateName(c.governorate, locale)}
                    </p>
                  </td>
                  <td className="px-4 py-3 max-md:col-span-2" data-label={t("orders")}>
                    <Link href={`/admin/orders?q=${c.phone}`} className="font-semibold tabular-nums hover:text-accent">
                      {c.orders}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted max-md:col-span-2 max-md:text-ink" data-label={t("firstOrder")}>{formatDate(c.first, locale)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted max-md:col-span-2 max-md:text-ink" data-label={t("lastOrder")}>{formatDate(c.last, locale)}</td>
                  <td className="px-4 py-3 text-end font-medium whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:self-start">{formatPrice(Number(c.spent), locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-muted">{q ? t("noMatch") : t("empty")}</p>}
        </div>
        <p className="mt-3 text-xs text-muted">{t("spentHint")}</p>

        <Pagination page={page} pages={pages} href={pageHref} />
      </ListFilters>
    </>
  );
}
