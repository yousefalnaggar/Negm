"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Sort } from "@/lib/catalog";

export type FilterValues = {
  q: string;
  category: string;
  min: string;
  max: string;
  inStock: boolean;
  sort: Sort;
};

/**
 * Sidebar filters for /shop. Choices (category, sort, stock) apply immediately;
 * text and price fields apply on Enter or the Apply button. Everything lives in the URL.
 */
export function ShopFilters({
  values,
  categories,
  bounds,
}: {
  values: FilterValues;
  categories: { slug: string; name: string }[];
  bounds: { min: number; max: number };
}) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = [values.q, values.category, values.min, values.max, values.inStock].filter(Boolean).length;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query: Record<string, string> = {};
    for (const [k, v] of new FormData(e.currentTarget)) {
      const s = String(v).trim();
      if (s && !(k === "sort" && s === "featured")) query[k] = s;
    }
    router.push({ pathname: "/shop", query }, { scroll: false });
  }

  function onChange(e: React.ChangeEvent<HTMLFormElement>) {
    const el = e.target as unknown as HTMLInputElement | HTMLSelectElement;
    if (el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT") e.currentTarget.requestSubmit();
  }

  const heading = "mb-3 text-sm font-semibold";
  const option = "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken";

  return (
    <aside>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-outline w-full lg:hidden"
        aria-expanded={open}
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.75} />
        {t("filters")}
        {active > 0 && <span className="rounded-full bg-accent px-2 text-xs leading-5 text-on-accent">{active}</span>}
      </button>

      <form
        onSubmit={onSubmit}
        onChange={onChange}
        role="search"
        className={`${open ? "block" : "hidden"} mt-4 space-y-7 lg:sticky lg:top-28 lg:mt-0 lg:block`}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            maxLength={100}
            className="input rounded-full ps-10"
          />
        </div>

        <div>
          <label htmlFor="sort" className={heading + " block"}>{t("sort")}</label>
          <select id="sort" name="sort" defaultValue={values.sort} className="input">
            <option value="featured">{t("sortFeatured")}</option>
            <option value="newest">{t("sortNewest")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
          </select>
        </div>

        <fieldset>
          <legend className={heading}>{t("category")}</legend>
          <label className={option}>
            <input type="radio" name="category" value="" defaultChecked={!values.category} className="accent-accent" />
            {t("all")}
          </label>
          {categories.map((c) => (
            <label key={c.slug} className={option}>
              <input type="radio" name="category" value={c.slug} defaultChecked={values.category === c.slug} className="accent-accent" />
              {c.name}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className={heading}>{t("price")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="min"
              defaultValue={values.min}
              inputMode="numeric"
              placeholder={`${t("min")} ${bounds.min}`}
              aria-label={t("min")}
              className="input"
              dir="ltr"
            />
            <input
              name="max"
              defaultValue={values.max}
              inputMode="numeric"
              placeholder={`${t("max")} ${bounds.max}`}
              aria-label={t("max")}
              className="input"
              dir="ltr"
            />
          </div>
        </fieldset>

        <label className={option + " -mx-2"}>
          <input type="checkbox" name="stock" value="1" defaultChecked={values.inStock} className="size-4 accent-accent" />
          {t("inStock")}
        </label>

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-dark flex-1">{t("apply")}</button>
          {active > 0 && (
            <Link href="/shop" scroll={false} className="btn-ghost">{t("clear")}</Link>
          )}
        </div>
      </form>
    </aside>
  );
}
