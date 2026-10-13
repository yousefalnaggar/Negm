import { ChevronRight, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddToCart } from "@/components/add-to-cart";
import { Gallery } from "@/components/gallery";
import { Price } from "@/components/price";
import { ProductGrid } from "@/components/product-card";
import { Link } from "@/i18n/navigation";
import { listProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { localDescription, localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatPrice } from "@/lib/money";

const getProduct = cache((slug: string) =>
  db.product.findFirst({
    where: { slug, active: true },
    include: { images: { orderBy: { position: "asc" } }, category: true },
  }),
);

export async function generateMetadata({ params }: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const img = mediaUrl(p.images[0]?.key);
  return {
    title: localName(p, locale),
    description: localDescription(p, locale).slice(0, 160),
    openGraph: img ? { images: [img] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as "ar" | "en");
  const product = await getProduct(slug);
  if (!product) notFound();

  const [t, tNav, related] = await Promise.all([
    getTranslations("product"),
    getTranslations("nav"),
    product.categoryId
      ? listProducts(locale, { categoryId: product.categoryId, excludeId: product.id, take: 4 })
      : Promise.resolve([]),
  ]);

  const name = localName(product, locale);
  const description = localDescription(product, locale);
  const images = product.images.map((i) => ({ url: mediaUrl(i.key)!, width: i.width, height: i.height }));
  const saving = product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice - product.price : 0;

  return (
    <div className="container-page pt-6 sm:pt-10">
      <nav className="flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-ink">{tNav("products")}</Link>
        {product.category && (
          <>
            <ChevronRight className="size-3.5 rtl:-scale-x-100" />
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink">
              {localName(product.category, locale)}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="animate-fade-up">
          <Gallery images={images} alt={name} />
        </div>

        <div className="animate-fade-up [animation-delay:150ms] lg:sticky lg:top-28 lg:self-start lg:py-4">
          <h1 className="font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">{name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price amount={product.price} compareAt={product.compareAtPrice} locale={locale} className="text-2xl font-semibold" />
            {saving > 0 && (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                {t("save", { amount: formatPrice(saving, locale) })}
              </span>
            )}
          </div>

          <p className="mt-4 text-sm font-medium">
            {product.stock <= 0 ? (
              <span className="text-danger">{t("outOfStock")}</span>
            ) : product.stock <= 3 ? (
              <span className="text-accent">{t("lowStock", { count: product.stock })}</span>
            ) : (
              <span className="text-success">{t("inStock")}</span>
            )}
          </p>

          <div className="mt-8">
            <AddToCart productId={product.id} stock={product.stock} />
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <Truck className="size-4" strokeWidth={1.75} /> {t("codNote")}
          </p>

          {description && (
            <div className="mt-10 border-t border-line pt-8">
              <h2 className="text-sm font-semibold">{t("details")}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-display text-3xl font-bold tracking-tight">{t("related")}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
