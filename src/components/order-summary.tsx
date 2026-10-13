import { getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/money";

export async function SummaryRows({
  subtotal,
  shipping,
  total,
  locale,
}: {
  subtotal: number;
  shipping: number;
  total: number;
  locale: string;
}) {
  const t = await getTranslations("cart");
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">{t("subtotal")}</dt>
        <dd className="font-medium">{formatPrice(subtotal, locale)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">{t("shipping")}</dt>
        <dd className="font-medium">{formatPrice(shipping, locale)}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base">
        <dt className="font-semibold">{t("total")}</dt>
        <dd className="font-semibold">{formatPrice(total, locale)}</dd>
      </div>
    </dl>
  );
}
