import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CardProduct } from "@/lib/catalog";
import { Price } from "./price";
import { Reveal } from "./reveal";

export function ProductCard({ product, priority = false }: { product: CardProduct; priority?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("product");
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sunken transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-18px_rgba(15,20,40,0.35)]">
        {product.image && (
          <img
            src={product.image.url}
            width={product.image.width}
            height={product.image.height}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            className={`size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] ${product.inStock ? "" : "opacity-60 grayscale-[30%]"}`}
          />
        )}
        <div className="absolute start-3 top-3 flex gap-1.5">
          {!product.inStock ? (
            <span className="rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
              {t("outOfStock")}
            </span>
          ) : onSale ? (
            <span className="rounded-full bg-pop px-2.5 py-1 text-xs font-bold text-on-pop">{t("sale")}</span>
          ) : null}
        </div>
        <span className="absolute end-3 bottom-3 grid size-10 translate-y-3 place-items-center rounded-full bg-accent text-on-accent opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-5 rtl:-scale-x-100" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 space-y-0.5 px-0.5">
        {product.category && <p className="text-xs font-medium text-muted">{product.category}</p>}
        <h3 className="font-semibold text-ink transition-colors group-hover:text-accent">{product.name}</h3>
        <Price amount={product.price} compareAt={product.compareAtPrice} locale={locale} className="text-sm font-bold" />
      </div>
    </Link>
  );
}

/** `withSidebar` drops to three columns on large screens to make room for the shop filters. */
export function ProductGrid({ products, withSidebar }: { products: CardProduct[]; withSidebar?: boolean }) {
  return (
    <Reveal
      stagger
      className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 ${withSidebar ? "" : "lg:grid-cols-4"}`}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </Reveal>
  );
}
