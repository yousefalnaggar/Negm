"use client";

import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "@/i18n/navigation";
import type { SearchSuggestions } from "@/lib/catalog";
import { shopHref } from "@/lib/shop-query";
import { Price } from "./price";

type Category = { slug: string; name: string };
type Results = SearchSuggestions & { term: string };

const searchHref = (q: string) => shopHref({ q, category: "", stock: false, sale: false, sort: "featured" });

/**
 * Header search. Opens a panel (full screen on phones) that suggests pieces and
 * categories while typing; Enter shows every result on the shop page.
 * Shortcuts: "/" or Ctrl+K.
 */
export function SearchDialog({ categories }: { categories: Category[] }) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState("");

  function show() {
    // On the shop's results page, start from the current search.
    const params = new URLSearchParams(location.search);
    setInitial(location.pathname.endsWith("/shop") ? (params.get("q") ?? "") : "");
    setOpen(true);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button type="button" onClick={show} aria-label={t("short")} className="grid size-9 place-items-center rounded-full text-ink hover:bg-sunken sm:size-10 xl:hidden">
        <Search className="size-[18px]" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={show}
        className="me-1 hidden w-52 items-center gap-2 rounded-full border border-line bg-surface py-2 ps-3.5 pe-2 text-sm text-muted transition-colors hover:border-ink xl:flex"
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="flex-1 text-start">{t("short")}</span>
        <kbd className="rounded-md border border-line px-1.5 font-sans text-[11px] leading-5">/</kbd>
      </button>
      {open && <SearchPanel initial={initial} categories={categories} onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchPanel({ initial, categories, onClose }: { initial: string; categories: Category[]; onClose: () => void }) {
  const t = useTranslations("search");
  const tProduct = useTranslations("product");
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const term = q.trim();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Ask the server once typing pauses; a newer search cancels the one in flight.
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q: term, locale })}`, { signal: controller.signal });
        if (res.ok) {
          setResults({ ...(await res.json()), term });
          setActive(-1);
        }
      } catch {
        // Aborted or offline: keep the previous suggestions.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, locale]);

  useEffect(() => {
    document.getElementById(`search-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const shown = term.length >= 2 ? results : null;
  const products = shown?.products ?? [];

  function go(href: string) {
    onClose();
    router.push(href);
  }

  // Arrow keys move through the products, then "See all results" (index products.length).
  function onKeyDown(e: React.KeyboardEvent) {
    const last = products.length;
    if (!last) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i >= last ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? last : i - 1));
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && active < products.length) go(`/product/${products[active].slug}`);
    else if (term) go(searchHref(term));
  }

  const chip = "inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink";
  const sectionTitle = "px-2 pb-2 text-xs font-semibold text-muted";
  const categoryChips = (list: Category[]) => (
    <div className="flex flex-wrap gap-2 px-2">
      {list.map((c) => (
        <Link key={c.slug} href={`/shop?category=${c.slug}`} onClick={onClose} className={chip}>
          {c.name}
        </Link>
      ))}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("short")}>
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div className="relative mx-auto flex h-dvh w-full animate-pop-in flex-col bg-surface sm:mt-[10vh] sm:h-auto sm:max-h-[75dvh] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-line sm:shadow-2xl">
        <form onSubmit={onSubmit} role="search" className="flex items-center gap-2 border-b border-line px-4 py-2 sm:px-5">
          <Search className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            type="search"
            enterKeyHint="search"
            maxLength={100}
            placeholder={t("placeholder")}
            aria-label={t("short")}
            role="combobox"
            aria-expanded={products.length > 0}
            aria-controls="search-results"
            aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted" />}
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label={t("clear")}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className="shrink-0 ps-1 text-sm font-semibold text-muted hover:text-ink sm:hidden">
            {t("cancel")}
          </button>
          <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 font-sans text-[11px] leading-5 text-muted sm:block">Esc</kbd>
        </form>

        <div id="search-results" className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
          {!shown ? (
            <div className="py-3">
              <p className={sectionTitle}>{t("browse")}</p>
              {categoryChips(categories)}
            </div>
          ) : shown.total === 0 && shown.categories.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="font-display text-lg font-semibold">{t("none", { q: shown.term })}</p>
              <p className="mt-1 text-sm text-muted">{t("noneHint")}</p>
              <div className="mt-6 flex justify-center [&>div]:justify-center">{categoryChips(categories)}</div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {shown.categories.length > 0 && (
                <div>
                  <p className={sectionTitle}>{t("categories")}</p>
                  {categoryChips(shown.categories)}
                </div>
              )}
              {products.length > 0 && (
                <div>
                  <p className={sectionTitle}>{t("products")}</p>
                  <ul role="listbox" aria-label={t("products")}>
                    {products.map((p, i) => (
                      <li key={p.id} id={`search-option-${i}`} role="option" aria-selected={i === active}>
                        <Link
                          href={`/product/${p.slug}`}
                          onClick={onClose}
                          onMouseMove={() => setActive(i)}
                          className={`flex items-center gap-3 rounded-2xl p-2 transition-colors ${i === active ? "bg-sunken" : ""}`}
                        >
                          <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-sunken">
                            {p.image && <img src={p.image.url} alt="" className="size-full object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 font-semibold text-ink">{p.name}</span>
                            <span className="block truncate text-xs text-muted">
                              {p.category}
                              {!p.inStock && <> · {tProduct("outOfStock")}</>}
                            </span>
                          </span>
                          <span className="max-w-28 shrink-0 text-end">
                            <Price amount={p.price} compareAt={p.compareAtPrice} locale={locale} className="justify-end text-sm font-bold" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {shown.total > 0 && (
                <Link
                  id={`search-option-${products.length}`}
                  href={searchHref(shown.term)}
                  onClick={onClose}
                  onMouseMove={() => setActive(products.length)}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold text-accent transition-colors ${active === products.length ? "bg-accent-soft" : "hover:bg-accent-soft"}`}
                >
                  {t("seeAll", { count: shown.total })}
                  <ArrowRight className="size-4 rtl:-scale-x-100" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
