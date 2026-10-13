import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { ProductGrid } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { getCategories, getPriceBounds, listProducts, SORTS } from "@/lib/catalog";
import { localName } from "@/lib/localized";
import { normalizeDigits } from "@/lib/normalize";

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim().slice(0, 100) : "";
}

/** Whole pounds from the URL, or undefined when empty or not a number. */
function pounds(v: string | string[] | undefined) {
  const s = normalizeDigits(str(v));
  return /^\d{1,7}$/.test(s) ? Number(s) : undefined;
}

async function readFilters(sp: SearchParams) {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === str(sp.category));
  return {
    categories,
    category,
    q: str(sp.q),
    min: pounds(sp.min),
    max: pounds(sp.max),
    inStock: str(sp.stock) === "1",
    sort: SORTS.find((s) => s === str(sp.sort)) ?? "featured",
  };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("shop");
  const { category } = await readFilters(await searchParams);
  return { title: category ? localName(category, locale) : t("title") };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  const f = await readFilters(await searchParams);

  const [t, products, bounds] = await Promise.all([
    getTranslations("shop"),
    listProducts(locale, {
      categoryId: f.category?.id,
      q: f.q,
      minPrice: f.min !== undefined ? f.min * 100 : undefined,
      maxPrice: f.max !== undefined ? f.max * 100 : undefined,
      inStock: f.inStock,
      sort: f.sort,
    }),
    getPriceBounds(),
  ]);

  const title = f.q ? t("searchResults", { q: f.q }) : f.category ? localName(f.category, locale) : t("title");
  const values = {
    q: f.q,
    category: f.category?.slug ?? "",
    min: f.min?.toString() ?? "",
    max: f.max?.toString() ?? "",
    inStock: f.inStock,
    sort: f.sort,
  };

  return (
    <div className="container-page pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-sm text-muted">{t("count", { count: products.length })}</p>
      </div>

      <div className="mt-8 gap-10 lg:grid lg:grid-cols-[250px_1fr]">
        <ShopFilters
          // Remount when the URL changes so the uncontrolled inputs show the new values.
          key={JSON.stringify(values)}
          values={values}
          categories={f.categories.map((c) => ({ slug: c.slug, name: localName(c, locale) }))}
          bounds={{ min: Math.floor(bounds.min / 100), max: Math.ceil(bounds.max / 100) }}
        />
        <div className="mt-8 lg:mt-0">
          {products.length ? (
            <ProductGrid key={JSON.stringify(values)} products={products} withSidebar />
          ) : (
            <EmptyState title={t("empty")} hint={t("emptyHint")} />
          )}
        </div>
      </div>
    </div>
  );
}
