import { ArrowLeft, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderActions } from "@/components/admin/order-actions";
import { StatusBadge } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { governorateName } from "@/lib/governorates";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatDate, formatPrice } from "@/lib/money";
import { STATUS_FLOW } from "@/lib/orders";

export default async function OrderDetailPage({ params }: PageProps<"/[locale]/admin/orders/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const [t, tCart, tCheckout] = await Promise.all([
    getTranslations("admin.ordersPage"),
    getTranslations("cart"),
    getTranslations("checkout"),
  ]);

  return (
    <>
      <Link href="/admin/orders" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t("back")}
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold tabular-nums">#{order.number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <Link href={`/admin/orders/${order.id}/print`} className="btn-outline" target="_blank">
          <Printer className="size-4" /> {t("print")}
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">{t("items")}</h2>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-sunken">
                    {i.imageKey && <img src={mediaUrl(i.imageKey)!} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{localName(i, locale)}</p>
                    <p className="text-muted">{formatPrice(i.unitPrice, locale)} × {i.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(i.lineTotal, locale)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{tCart("subtotal")}</dt><dd>{formatPrice(order.subtotal, locale)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{tCart("shipping")}</dt><dd>{formatPrice(order.shippingFee, locale)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>{tCart("total")}</dt><dd>{formatPrice(order.total, locale)}</dd></div>
            </dl>
          </section>

          {STATUS_FLOW[order.status].length > 0 && (
            <section className="card p-5">
              <h2 className="mb-4 font-semibold">{t("actions")}</h2>
              <OrderActions orderId={order.id} next={STATUS_FLOW[order.status]} />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold">{t("customerInfo")}</h2>
            <p>{order.customerName}</p>
            <p className="mt-1"><a href={`tel:${order.phone}`} dir="ltr" className="text-accent hover:underline">{order.phone}</a></p>
            {order.email && <p className="mt-1 text-muted" dir="ltr">{order.email}</p>}
            <p className="mt-3 text-xs text-muted">{formatDate(order.createdAt, locale, true)} · {order.locale.toUpperCase()}</p>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold">{t("deliveryInfo")}</h2>
            <p className="leading-relaxed">
              {order.address}<br />{order.city} — {governorateName(order.governorate, locale)}
            </p>
            <p className="mt-3 text-xs text-muted">{tCheckout("cod")}</p>
          </section>
          {order.notes && (
            <section className="card p-5 text-sm">
              <h2 className="mb-3 font-semibold">{t("notes")}</h2>
              <p className="whitespace-pre-line text-muted">{order.notes}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
