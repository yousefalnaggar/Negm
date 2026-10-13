import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PrintButton } from "@/components/admin/print-button";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { governorateName } from "@/lib/governorates";
import { localName } from "@/lib/localized";
import { formatDate, formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export default async function PrintPage({ params }: PageProps<"/[locale]/admin/orders/[id]/print">) {
  const { locale, id } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const [t, tCart, tCheckout, settings] = await Promise.all([
    getTranslations("admin.ordersPage"),
    getTranslations("cart"),
    getTranslations("checkout"),
    getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-black print:max-w-none print:rounded-none print:p-0">
      <div className="flex items-start justify-between border-b border-black/20 pb-4">
        <div>
          <p className="text-2xl font-bold">{locale === "ar" ? settings.storeNameAr : settings.storeNameEn}</p>
          <p className="text-sm" dir="ltr">{settings.phone}</p>
        </div>
        <div className="text-end">
          <p className="text-sm">{t("packingSlip")}</p>
          <p className="text-2xl font-bold">#{order.number}</p>
          <p className="text-sm">{formatDate(order.createdAt, locale)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 py-4 text-sm">
        <div>
          <p className="font-bold">{t("customerInfo")}</p>
          <p>{order.customerName}</p>
          <p dir="ltr" className="text-start">{order.phone}</p>
        </div>
        <div>
          <p className="font-bold">{t("deliveryInfo")}</p>
          <p>{order.address}</p>
          <p>{order.city} — {governorateName(order.governorate, locale)}</p>
        </div>
      </div>

      <table className="w-full border-y border-black/20 text-sm">
        <thead>
          <tr className="border-b border-black/20">
            <th className="py-2 text-start">{t("items")}</th>
            <th className="py-2 text-center">{t("qty")}</th>
            <th className="py-2 text-end">{t("price")}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b border-black/10">
              <td className="py-2">{localName(i, locale)}</td>
              <td className="py-2 text-center">{i.quantity}</td>
              <td className="py-2 text-end">{formatPrice(i.lineTotal, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ms-auto mt-4 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><dt>{tCart("subtotal")}</dt><dd>{formatPrice(order.subtotal, locale)}</dd></div>
        <div className="flex justify-between"><dt>{tCart("shipping")}</dt><dd>{formatPrice(order.shippingFee, locale)}</dd></div>
        <div className="flex justify-between text-base font-bold"><dt>{tCheckout("cod")}</dt><dd>{formatPrice(order.total, locale)}</dd></div>
      </dl>

      {order.notes && <p className="mt-6 border-t border-black/20 pt-3 text-sm"><b>{t("notes")}:</b> {order.notes}</p>}

      <div className="no-print mt-8 text-center">
        <PrintButton label={t("print")} />
      </div>
    </div>
  );
}
