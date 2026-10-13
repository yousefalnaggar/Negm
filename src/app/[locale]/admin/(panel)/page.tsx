import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { localName } from "@/lib/localized";
import { formatDate, formatPrice } from "@/lib/money";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();

  const since = daysAgo(30);
  const [t, tAdmin, newOrders, agg, recent, lowStock] = await Promise.all([
    getTranslations("admin.stats"),
    getTranslations("admin"),
    db.order.count({ where: { status: "NEW" } }),
    db.order.aggregate({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.product.findMany({ where: { active: true, stock: { lte: 3 } }, orderBy: { stock: "asc" }, take: 8 }),
  ]);
  const revenue = agg._sum.total ?? 0;
  const avg = agg._count ? Math.round(revenue / agg._count) : 0;

  const stats = [
    { label: t("newOrders"), value: String(newOrders), highlight: newOrders > 0 },
    { label: t("revenue30"), value: formatPrice(revenue, locale) },
    { label: t("orders30"), value: String(agg._count) },
    { label: t("avgOrder"), value: formatPrice(avg, locale) },
  ];

  return (
    <>
      <PageHeader title={tAdmin("dashboard")} />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`card flex items-center justify-between gap-3 p-4 sm:block sm:p-5 ${s.highlight ? "border-accent" : ""}`}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`text-xl font-semibold whitespace-nowrap tabular-nums sm:mt-2 sm:text-2xl ${s.highlight ? "text-accent" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">{t("recentOrders")}</h2>
            <Link href="/admin/orders" className="text-sm text-accent hover:underline">{tAdmin("orders")}</Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("none")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                    <span className="w-14 font-semibold tabular-nums">#{o.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{o.customerName}</span>
                      <span className="text-xs text-muted">{formatDate(o.createdAt, locale, true)}</span>
                    </span>
                    <StatusBadge status={o.status} />
                    <span className="hidden w-28 text-end text-sm font-medium sm:block">{formatPrice(o.total, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card h-fit overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">{t("lowStockTitle")}</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("none")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-sunken/60">
                    <span className="truncate">{localName(p, locale)}</span>
                    <span className={`font-semibold tabular-nums ${p.stock === 0 ? "text-danger" : "text-accent"}`}>{p.stock}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
