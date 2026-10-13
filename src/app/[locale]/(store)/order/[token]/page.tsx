import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SummaryRows } from "@/components/order-summary";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { governorateName } from "@/lib/governorates";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatDate, formatPrice } from "@/lib/money";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params }: PageProps<"/[locale]/order/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale as "ar" | "en");
  if (token.length > 64) notFound();
  const order = await db.order.findUnique({ where: { publicToken: token }, include: { items: true } });
  if (!order) notFound();
  const [t, tStatus, tCheckout] = await Promise.all([
    getTranslations("order"),
    getTranslations("status"),
    getTranslations("checkout"),
  ]);
  const firstName = order.customerName.split(" ")[0];

  return (
    <div className="container-page max-w-3xl pt-12 sm:pt-16">
      <div className="text-center">
        <CircleCheck className="mx-auto size-12 text-success" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">{t("thanksTitle", { name: firstName })}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          {t("thanksBody", { phone: order.phone })}
        </p>
      </div>

      <dl className="card mt-10 grid grid-cols-2 gap-6 p-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">{t("number")}</dt>
          <dd className="mt-1 font-semibold">#{order.number}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("date")}</dt>
          <dd className="mt-1 font-semibold">{formatDate(order.createdAt, locale)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("status")}</dt>
          <dd className="mt-1 font-semibold">{tStatus(order.status)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("payment")}</dt>
          <dd className="mt-1 font-semibold">{tCheckout("cod")}</dd>
        </div>
      </dl>

      <div className="card mt-4 p-6">
        <h2 className="font-semibold">{t("items")}</h2>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-sunken">
                {i.imageKey && <img src={mediaUrl(i.imageKey)!} alt="" className="size-full object-cover" />}
              </div>
              <p className="flex-1 text-sm">
                {localName(i, locale)} <span className="text-muted">× {i.quantity}</span>
              </p>
              <p className="text-sm font-medium">{formatPrice(i.lineTotal, locale)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-4">
          <SummaryRows subtotal={order.subtotal} shipping={order.shippingFee} total={order.total} locale={locale} />
        </div>
      </div>

      <div className="card mt-4 p-6 text-sm">
        <h2 className="font-semibold">{t("deliverTo")}</h2>
        <p className="mt-3 leading-relaxed text-muted">
          {order.customerName}
          <br />
          {order.address}
          <br />
          {order.city}{locale === "ar" ? "، " : ", "}{governorateName(order.governorate, locale)}
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted">{t("saveLink")}</p>
      <div className="mt-6 text-center">
        <Link href="/shop" className="btn-outline">{t("backHome")}</Link>
      </div>
    </div>
  );
}
