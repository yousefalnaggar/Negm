import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * The page numbers to show: all of them up to 7, otherwise the first, the last,
 * the current one with its neighbours, and "…" for the gaps (always 7 slots).
 */
function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", pages];
  if (page >= pages - 3) return [1, "…", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, "…", page - 1, page, page + 1, "…", pages];
}

/** Numbered page links. `href` builds the URL for a page, keeping the current filters. */
export async function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const t = await getTranslations("pagination");
  const item = "flex size-9 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors sm:size-10";

  return (
    <nav aria-label={t("label")} className="mt-10 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
      {pageList(page, pages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} aria-hidden className={`${item} text-muted`}>…</span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${item} bg-ink text-bg`}>{p}</span>
        ) : (
          <Link key={p} href={href(p)} aria-label={t("page", { page: p })} className={`${item} border border-line bg-surface hover:border-ink`}>
            {p}
          </Link>
        ),
      )}
    </nav>
  );
}
