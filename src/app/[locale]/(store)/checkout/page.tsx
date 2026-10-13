import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout-form";
import { SummaryRows } from "@/components/order-summary";
import { redirect } from "@/i18n/navigation";
import { cartTotals, getCart } from "@/lib/cart";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  const [t, tCart, cart, settings] = await Promise.all([
    getTranslations("checkout"),
    getTranslations("cart"),
    getCart(),
    getSettings(),
  ]);
  const totals = cartTotals(cart, settings.shippingFee);
  if (totals.items.length === 0) redirect({ href: "/cart", locale: locale as "ar" | "en" });

  return (
    <div className="container-page pt-10 sm:pt-14">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px]">
        <CheckoutForm idempotencyKey={randomUUID()} />

        <aside className="card order-first h-fit p-6 lg:sticky lg:top-28 lg:order-none">
          <h2 className="mb-5 font-semibold">{tCart("summary")}</h2>
          <ul className="mb-6 space-y-4">
            {totals.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-sunken">
                  {i.product.images[0] && <img src={mediaUrl(i.product.images[0].key)!} alt="" className="size-full object-cover" />}
                  <span className="absolute -end-0 -top-0 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] leading-5 font-bold text-bg">
                    {i.quantity}
                  </span>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm">{localName(i.product, locale)}</p>
                <p className="text-sm font-medium">{formatPrice(i.product.price * i.quantity, locale)}</p>
              </li>
            ))}
          </ul>
          <SummaryRows subtotal={totals.subtotal} shipping={totals.shipping} total={totals.total} locale={locale} />
        </aside>
      </div>
    </div>
  );
}
