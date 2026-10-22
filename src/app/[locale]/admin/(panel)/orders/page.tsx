import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExportMenu } from "@/components/admin/export-menu";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Pagination } from "@/components/pagination";
import { Link } from "@/i18n/navigation";
import { ADMIN_PAGE_SIZE as PAGE_SIZE, ORDER_SORT, readOrderFilters, STATUSES } from "@/lib/admin-lists";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { governorateName } from "@/lib/governorates";
import { formatDate, formatPrice } from "@/lib/money";

export default async function OrdersPage({ params, searchParams }: PageProps<"/[locale]/admin/orders">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();

  const sp = await searchParams;
  const { status, q, from, to, page, where } = readOrderFilters(sp);

  const [t, tAdmin, orders, total] = await Promise.all([
    getTranslations("admin.ordersPage"),
    getTranslations("admin"),
    db.order.findMany({ where, orderBy: ORDER_SORT, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.order.count({ where }),
  ]);
  const tStatus = await getTranslations("status");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q, from, to, page, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title={tAdmin("orders")} count={tAdmin("counts.orders", { count: total })}>
        <ExportMenu list="orders" onPage={orders.length} total={total} />
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={qs({ status: s, page: 1 })}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${s === status ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink"}`}
          >
            {s ? tStatus(s) : t("all")}
          </Link>
        ))}
      </div>

      <ListFilters placeholder={t("search")} dates filterKeys={["q", "status", "from", "to"]}>
        <div className="card">
          <table className="table-cards w-full text-sm">
            <thead className="border-b border-line text-start text-xs text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("order")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("customer")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("date")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className={`relative cursor-pointer hover:bg-sunken/60 ${o.status === "NEW" ? "bg-accent-soft/40" : ""}`}>
                  <td className="px-4 py-3">
                    {/* The link covers the whole row, so clicking anywhere on it opens the order. */}
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold tabular-nums after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-accent">
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-md:col-span-2">
                    <p>{o.customerName}</p>
                    <p className="text-xs text-muted">
                      <span dir="ltr">{o.phone}</span> · {governorateName(o.governorate, locale)}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(o.createdAt, locale, true)}</td>
                  <td className="px-4 py-3 max-md:col-start-2 max-md:row-start-1 max-md:justify-self-end"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-end font-medium whitespace-nowrap max-md:justify-self-end">{formatPrice(o.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="p-8 text-center text-muted">{t("empty")}</p>}
        </div>

        <Pagination page={page} pages={pages} href={(p) => qs({ page: p })} />
      </ListFilters>
    </>
  );
}
