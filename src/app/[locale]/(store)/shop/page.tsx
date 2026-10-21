import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-card";
import { ShopControls } from "@/components/shop-controls";
import { Link } from "@/i18n/navigation";
import { categoryCounts, getCategories, getPriceBounds, pageProducts } from "@/lib/catalog";
import { localName } from "@/lib/localized";
import { clearFilters, parseShopQuery, shopHref } from "@/lib/shop-query";

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

/** Filters from the URL, with an unknown category slug dropped. */
async function readQuery(sp: SearchParams) {
  const categories = await getCategories();
  const { query, page } = parseShopQuery(sp);
  const category = categories.find((c) => c.slug === query.category);
  if (!category) query.category = "";
  return { query, page, categories, category };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("shop");
  const { category } = await readQuery(await searchParams);
  return { title: category ? localName(category, locale) : t("title") };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  const { query, page, categories, category } = await readQuery(await searchParams);

  const filters = {
    categoryId: category?.id,
    q: query.q,
    minPrice: query.min !== undefined ? query.min * 100 : undefined,
    maxPrice: query.max !== undefined ? query.max * 100 : undefined,
    inStock: query.stock,
    onSale: query.sale,
    sort: query.sort,
  };
  const [t, { products, total }, counts, bounds] = await Promise.all([
    getTranslations("shop"),
    pageProducts(locale, filters, page, PAGE_SIZE),
    categoryCounts(filters),
    getPriceBounds(),
  ]);

  const title = query.q ? t("searchResults", { q: query.q }) : category ? localName(category, locale) : t("title");
  const filtered = shopHref(clearFilters(query)) !== shopHref(query);

  return (
    <div className="container-page pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-sm text-muted">{t("count", { count: total })}</p>
      </div>

      <div className="mt-8">
        <ShopControls
          query={query}
          categories={categories.map((c) => ({ slug: c.slug, name: localName(c, locale), count: counts.get(c.id) ?? 0 }))}
          allCount={[...counts.values()].reduce((a, b) => a + b, 0)}
          total={total}
          bounds={{ min: Math.floor(bounds.min / 100), max: Math.ceil(bounds.max / 100) }}
        >
          {total > 0 ? (
            <>
              <ProductGrid key={`${shopHref(query)}-${page}`} products={products} />
              <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} href={(p) => shopHref(query, p)} />
            </>
          ) : (
            <EmptyState title={filtered ? t("noMatch") : t("empty")} hint={filtered ? t("emptyHint") : undefined}>
              {filtered && (
                <Link href={shopHref(clearFilters(query))} className="btn-dark">{t("clear")}</Link>
              )}
            </EmptyState>
          )}
        </ShopControls>
      </div>
    </div>
  );
}
