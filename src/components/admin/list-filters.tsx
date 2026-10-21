"use client";

import { Loader2, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Search box (and optional date range) for the admin lists. Everything applies as you
 * type or pick, through the URL, and the list dims while the new results load.
 * `filterKeys` are the URL params that count as filters, so "Clear filters" can show.
 */
export function ListFilters({
  placeholder,
  dates = false,
  filterKeys = ["q"],
  children,
}: {
  placeholder: string;
  dates?: boolean;
  filterKeys?: string[];
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const clearing = useRef(false);

  function go(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // new filters start from the first page
    const s = next.toString();
    startTransition(() => router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }));
  }

  // Search once typing pauses.
  const urlQ = params.get("q") ?? "";
  useEffect(() => {
    if (clearing.current) {
      clearing.current = false; // "Clear filters" already set the URL
      return;
    }
    if (q.trim() === urlQ) return;
    const timer = setTimeout(() => go({ q: q.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only typing should trigger this
  }, [q]);

  const active = filterKeys.some((k) => params.get(k)) || q.trim() !== "";

  function clear() {
    clearing.current = q !== "";
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <>
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-3 sm:p-4">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            maxLength={100}
            className="input ps-10 pe-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {pending && <Loader2 className="absolute end-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>
        {dates && (
          // Keyed on the URL so the inputs show its dates, including after "Clear filters".
          <div key={`${params.get("from")}|${params.get("to")}`} className="grid w-full gap-3 min-[400px]:grid-cols-2 sm:w-auto">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="grid min-w-0 gap-1 text-xs font-medium text-muted">
                {t(k)}
                <input
                  type="date"
                  defaultValue={params.get(k) ?? ""}
                  // While a year is being typed it passes through dates like 0002-…; wait for a real one.
                  onChange={(e) => (!e.target.value || e.target.value >= "2000") && go({ [k]: e.target.value })}
                  className="input min-w-0 py-2"
                />
              </label>
            ))}
          </div>
        )}
        {active && (
          <button type="button" onClick={clear} className="btn-ghost shrink-0 px-4 text-muted hover:text-ink">
            <X className="size-4" /> {t("clear")}
          </button>
        )}
      </div>

      <div className={`transition-opacity duration-200 ${pending ? "pointer-events-none opacity-50" : ""}`} aria-busy={pending}>
        {children}
      </div>
    </>
  );
}
