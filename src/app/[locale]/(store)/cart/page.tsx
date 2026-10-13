import { ArrowRight, Banknote } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartItemControls } from "@/components/cart-item-controls";
import { EmptyState } from "@/components/empty-state";
import { SummaryRows } from "@/components/order-summary";
import { Link } from "@/i18n/navigation";
import { cartTotals, getCart } from "@/lib/cart";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  const [t, cart, settings] = await Promise.all([getTranslations("cart"), getCart(), getSettings()]);
  const totals = cartTotals(cart, settings.shippingFee);
  const allItems = cart?.items ?? [];
  const blocked = allItems.some((i) => !i.product.active || i.quantity > i.product.stock);

  return (
    <div className="container-page pt-10 sm:pt-14">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>

      {allItems.length === 0 ? (
        <div className="mt-10">
          <EmptyState title={t("empty")} hint={t("emptyHint")}>
            <Link href="/shop" className="btn-primary">{t("startShopping")}</Link>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-line border-y border-line">
            {allItems.map((item) => {
              const p = item.product;
              const img = p.images[0];
              const unavailable = !p.active || p.stock <= 0;
              return (
                <li key={item.id} className="flex gap-4 py-5 sm:gap-6">
                  <Link href={`/product/${p.slug}`} className="shrink-0">
                    <div className="size-24 overflow-hidden rounded-xl bg-sunken sm:size-28">
                      {img && <img src={mediaUrl(img.key)!} alt="" className="size-full object-cover" />}
                    </div>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/product/${p.slug}`} className="font-medium hover:underline">
                          {localName(p, locale)}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted">{formatPrice(p.price, locale)}</p>
                        {unavailable ? (
                          <p className="mt-1 text-xs font-medium text-danger">{t("unavailable")}</p>
                        ) : item.quantity > p.stock ? (
                          <p className="mt-1 text-xs font-medium text-danger">{t("onlyLeft", { count: p.stock })}</p>
                        ) : null}
                      </div>
                      <p className="font-semibold whitespace-nowrap">{formatPrice(p.price * item.quantity, locale)}</p>
                    </div>
                    <CartItemControls itemId={item.id} quantity={item.quantity} max={unavailable ? 0 : p.stock} />
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="card h-fit p-6 lg:sticky lg:top-28">
            <h2 className="mb-5 font-semibold">{t("summary")}</h2>
            <SummaryRows subtotal={totals.subtotal} shipping={totals.shipping} total={totals.total} locale={locale} />
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-sunken p-3 text-xs text-muted">
              <Banknote className="size-4 shrink-0" strokeWidth={1.75} /> {t("codNote")}
            </p>
            {blocked || totals.items.length === 0 ? (
              <button type="button" disabled className="btn-primary mt-5 w-full py-3.5">{t("checkout")}</button>
            ) : (
              <Link href="/checkout" className="btn-primary mt-5 w-full py-3.5">
                {t("checkout")}
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            )}
            <Link href="/shop" className="mt-3 block text-center text-sm text-muted hover:text-ink">
              {t("continue")}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
