"use client";

import { Check, ChevronDown, Loader2, SlidersHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "@/i18n/navigation";
import { clearFilters, pounds, PRICE_RANGES, type ShopQuery, shopHref, SORTS, type Sort } from "@/lib/shop-query";

type Category = { slug: string; name: string; count: number };
type Props = {
  query: ShopQuery;
  categories: Category[];
  allCount: number;
  total: number;
  bounds: { min: number; max: number };
  children: React.ReactNode;
};

const SORT_LABELS = {
  featured: "sortFeatured",
  newest: "sortNewest",
  "price-asc": "sortPriceAsc",
  "price-desc": "sortPriceDesc",
} as const satisfies Record<Sort, string>;

const pill = (on: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
    on ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-ink"
  }`;

/**
 * Category chips, the filter bar (a bottom sheet on phones) and the active filters.
 * Every choice applies at once: the URL changes and the server sends the new results.
 * The controls update immediately (optimistic) while the results load.
 */
export function ShopControls({ query, categories, allCount, total, bounds, children }: Props) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(query);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const priceLabel = usePriceLabel();

  function go(next: ShopQuery) {
    startTransition(() => {
      setShown(next);
      router.push(shopHref(next), { scroll: false });
    });
  }

  const hasPrice = shown.min !== undefined || shown.max !== undefined;
  const categoryName = categories.find((c) => c.slug === shown.category)?.name;
  const active = [
    shown.q && { label: `“${shown.q}”`, next: { ...shown, q: "" } },
    categoryName && { label: categoryName, next: { ...shown, category: "" } },
    hasPrice && { label: priceLabel(shown.min, shown.max), next: { ...shown, min: undefined, max: undefined } },
    shown.stock && { label: t("inStock"), next: { ...shown, stock: false } },
    shown.sale && { label: t("onSale"), next: { ...shown, sale: false } },
  ].filter((x) => !!x);
  const filterCount = [shown.category, hasPrice, shown.stock, shown.sale].filter(Boolean).length;

  return (
    <>
      <CategoryChips query={shown} categories={categories} allCount={allCount} go={go} />

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => setSheetOpen(true)} className={`${pill(false)} flex-1 justify-center md:hidden`}>
          <SlidersHorizontal className="size-4" strokeWidth={1.75} />
          {t("filters")}
          {filterCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-on-accent">{filterCount}</span>
          )}
        </button>
        <div className="hidden items-center gap-2 md:flex">
          <PriceMenu query={shown} bounds={bounds} go={go} />
          <button type="button" aria-pressed={shown.stock} onClick={() => go({ ...shown, stock: !shown.stock })} className={pill(shown.stock)}>
            {shown.stock && <Check className="size-4" />}
            {t("inStock")}
          </button>
          <button type="button" aria-pressed={shown.sale} onClick={() => go({ ...shown, sale: !shown.sale })} className={pill(shown.sale)}>
            {shown.sale && <Check className="size-4" />}
            {t("onSale")}
          </button>
        </div>
        <SortSelect value={shown.sort} onChange={(sort) => go({ ...shown, sort })} />
      </div>

      {active.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {active.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => go(f.next)}
              aria-label={t("remove", { label: f.label })}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent-soft py-1.5 ps-3.5 pe-2.5 text-sm font-medium text-accent hover:brightness-95"
            >
              <span className="truncate">{f.label}</span>
              <X className="size-3.5 shrink-0" strokeWidth={2.25} />
            </button>
          ))}
          <button type="button" onClick={() => go(clearFilters(shown))} className="px-2 py-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
            {t("clear")}
          </button>
        </div>
      )}

      <div className={`mt-8 transition-opacity duration-200 ${pending ? "pointer-events-none opacity-50" : ""}`} aria-busy={pending}>
        {children}
      </div>

      {sheetOpen && (
        <FilterSheet
          query={shown}
          categories={categories}
          allCount={allCount}
          total={total}
          bounds={bounds}
          pending={pending}
          go={go}
          onClose={closeSheet}
        />
      )}
    </>
  );
}

/** "Under 3,000 EGP", "3,000 – 6,000 EGP", "20,000+ EGP" or "Any price". */
function usePriceLabel() {
  const t = useTranslations("shop");
  const locale = useLocale();
  const n = (v: number) => new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG").format(v);
  return (min?: number, max?: number) => {
    if (min === undefined && max === undefined) return t("anyPrice");
    if (min === undefined) return t("under", { max: n(max!) });
    if (max === undefined) return t("over", { min: n(min) });
    return t("between", { min: n(min), max: n(max) });
  };
}

/** Links (so they can be opened in a new tab and crawled), but clicks go through `go` for the loading state. */
function CategoryChips({ query, categories, allCount, go }: { query: ShopQuery; categories: Category[]; allCount: number; go: (q: ShopQuery) => void }) {
  const t = useTranslations("shop");
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {[{ slug: "", name: t("all"), count: allCount }, ...categories].map((c) => {
        const selected = c.slug === query.category;
        const empty = !selected && c.count === 0;
        const next = { ...query, category: c.slug };
        return (
          <Link
            key={c.slug || "all"}
            href={shopHref(next)}
            scroll={false}
            onClick={(e) => {
              e.preventDefault();
              if (!selected && !empty) go(next);
            }}
            aria-current={selected ? "page" : undefined}
            aria-disabled={empty || undefined}
            className={`${pill(selected)} max-sm:px-3 max-sm:py-1.5 ${empty ? "pointer-events-none opacity-40" : ""}`}
          >
            {c.name}
            <span className={`text-xs tabular-nums ${selected ? "text-bg/70" : "text-muted"}`}>{c.count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SortSelect({ value, onChange }: { value: Sort; onChange: (sort: Sort) => void }) {
  const t = useTranslations("shop");
  return (
    <label className="relative flex-1 md:ms-auto md:flex-none">
      <span className="sr-only">{t("sort")}</span>
      <select
        key={value}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="w-full cursor-pointer appearance-none rounded-full border border-line bg-surface py-2 ps-4 pe-10 text-sm font-medium text-ink transition-colors hover:border-ink focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>{t(SORT_LABELS[s])}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </label>
  );
}

function PriceMenu({ query, bounds, go }: { query: ShopQuery; bounds: Props["bounds"]; go: (q: ShopQuery) => void }) {
  const t = useTranslations("shop");
  const priceLabel = usePriceLabel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const on = query.min !== undefined || query.max !== undefined;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={pill(on)}>
        {on ? priceLabel(query.min, query.max) : t("price")}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute start-0 top-full z-30 mt-2 w-80 origin-top animate-pop-in rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_50px_-20px_rgba(15,20,40,0.35)]">
          <PriceOptions
            query={query}
            bounds={bounds}
            onPick={(min, max) => {
              setOpen(false);
              go({ ...query, min, max });
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Ready-made ranges plus a custom from/to (typing needs a button to confirm). */
function PriceOptions({ query, bounds, onPick }: { query: ShopQuery; bounds: Props["bounds"]; onPick: (min?: number, max?: number) => void }) {
  const t = useTranslations("shop");
  const priceLabel = usePriceLabel();
  const ranges = [{}, ...PRICE_RANGES];
  const isPreset = ranges.some((r) => r.min === query.min && r.max === query.max);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let min = pounds(String(form.get("min") ?? ""));
    let max = pounds(String(form.get("max") ?? ""));
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
    onPick(min, max);
  }

  return (
    <>
      <div role="radiogroup" aria-label={t("price")} className="grid gap-0.5">
        {ranges.map((r, i) => {
          const selected = r.min === query.min && r.max === query.max;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(r.min, r.max)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${
                selected ? "bg-accent-soft font-semibold text-accent" : "text-ink hover:bg-sunken"
              }`}
            >
              {priceLabel(r.min, r.max)}
              {selected && <Check className="size-4" />}
            </button>
          );
        })}
      </div>
      <form key={`${query.min}-${query.max}`} onSubmit={onSubmit} className="mt-2 border-t border-line px-1 pt-3 pb-1">
        <p className="mb-2 px-2 text-xs font-semibold text-muted">{t("customPrice")}</p>
        <div className="flex gap-2">
          <input
            name="min"
            defaultValue={isPreset ? "" : query.min}
            inputMode="numeric"
            placeholder={`${t("min")} ${bounds.min}`}
            aria-label={t("min")}
            className="input min-w-0 py-2"
            dir="ltr"
          />
          <input
            name="max"
            defaultValue={isPreset ? "" : query.max}
            inputMode="numeric"
            placeholder={`${t("max")} ${bounds.max}`}
            aria-label={t("max")}
            className="input min-w-0 py-2"
            dir="ltr"
          />
          <button type="submit" className="btn-dark shrink-0 px-4 py-2">{t("apply")}</button>
        </div>
      </form>
    </>
  );
}

/** Phones: every filter in a sheet that slides up, applying as you tap. */
function FilterSheet({
  query,
  categories,
  allCount,
  total,
  bounds,
  pending,
  go,
  onClose,
}: Omit<Props, "children"> & { pending: boolean; go: (q: ShopQuery) => void; onClose: () => void }) {
  const t = useTranslations("shop");
  const tNav = useTranslations("nav");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const heading = "mb-3 text-sm font-semibold text-ink";

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("filters")}>
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] animate-sheet-up flex-col rounded-t-3xl bg-bg shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <span className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="pt-2 font-display text-xl font-bold">{t("filters")}</h2>
          <button type="button" onClick={onClose} autoFocus className="mt-1 grid size-10 place-items-center rounded-full hover:bg-sunken" aria-label={tNav("close")}>
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 pt-2 pb-6">
          <section>
            <h3 className={heading}>{t("category")}</h3>
            <div className="flex flex-wrap gap-2">
              {[{ slug: "", name: t("all"), count: allCount }, ...categories].map((c) => {
                const selected = c.slug === query.category;
                return (
                  <button
                    key={c.slug || "all"}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && c.count === 0}
                    onClick={() => go({ ...query, category: c.slug })}
                    className={`${pill(selected)} disabled:opacity-40`}
                  >
                    {c.name}
                    <span className={`text-xs tabular-nums ${selected ? "text-bg/70" : "text-muted"}`}>{c.count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className={heading}>{t("price")}</h3>
            <div className="-mx-1">
              <PriceOptions query={query} bounds={bounds} onPick={(min, max) => go({ ...query, min, max })} />
            </div>
          </section>

          <section>
            <h3 className={heading}>{t("availability")}</h3>
            <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
              <Switch label={t("inStock")} on={query.stock} onChange={() => go({ ...query, stock: !query.stock })} />
              <Switch label={t("onSale")} on={query.sale} onChange={() => go({ ...query, sale: !query.sale })} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-line bg-bg px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => go(clearFilters(query))} className="btn-ghost">{t("clear")}</button>
          <button type="button" onClick={onClose} className="btn-primary">
            {pending ? <Loader2 className="size-4 animate-spin" /> : t("showResults", { count: total })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium">
      {label}
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
      </span>
    </button>
  );
}
