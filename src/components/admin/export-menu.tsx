"use client";

import { ChevronDown, Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/** "Export" button: download this page or every matching row as CSV, with the current filters. */
export function ExportMenu({ list, onPage, total }: { list: "orders" | "customers"; onPage: number; total: number }) {
  const t = useTranslations("admin.export");
  const locale = useLocale();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const href = (scope: "page" | "all") => {
    const p = new URLSearchParams(params);
    p.set("scope", scope);
    p.set("locale", locale);
    return `/api/admin/export/${list}?${p}`;
  };
  const option = "flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-sunken";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} disabled={total === 0} aria-expanded={open} className="btn-outline">
        <Download className="size-4" /> {t("button")}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-2 w-64 origin-top animate-pop-in rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_50px_-20px_rgba(15,20,40,0.35)]">
          <a href={href("page")} download onClick={() => setOpen(false)} className={option}>
            {t("thisPage")} <span className="text-xs text-muted tabular-nums">{onPage}</span>
          </a>
          <a href={href("all")} download onClick={() => setOpen(false)} className={option}>
            {t("all")} <span className="text-xs text-muted tabular-nums">{total}</span>
          </a>
          <p className="border-t border-line px-3 pt-2 pb-1 mt-1 text-xs text-muted">{t("hint")}</p>
        </div>
      )}
    </div>
  );
}
