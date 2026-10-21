import { Pencil, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { deleteProduct } from "@/actions/admin";
import { DeleteButton } from "@/components/admin/delete-button";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/ui";
import { Pagination } from "@/components/pagination";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { matchSearchText } from "@/lib/catalog";
import { db } from "@/lib/db";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import { normalizeDigits } from "@/lib/normalize";

const PAGE_SIZE = 24;

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/admin/products">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number(normalizeDigits(typeof sp.page === "string" ? sp.page : "")) || 1);
  const where = matchSearchText(q);

  const [t, tAdmin, products, total] = await Promise.all([
    getTranslations("admin.productsPage"),
    getTranslations("admin"),
    db.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      include: { images: { orderBy: { position: "asc" }, take: 1 }, category: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  const pageHref = (p: number) => {
    const s = new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title={tAdmin("products")} count={tAdmin("counts.products", { count: total })}>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="size-4" /> {t("new")}
        </Link>
      </PageHeader>

      <ListFilters placeholder={t("search")}>
        <div className="card">
          <table className="table-cards w-full text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-3 py-3 xl:px-4 text-start font-medium">{t("name")}</th>
                <th className="px-3 py-3 xl:px-4 text-start font-medium">{t("category")}</th>
                <th className="px-3 py-3 xl:px-4 text-end font-medium">{t("price")}</th>
                <th className="px-3 py-3 xl:px-4 text-end font-medium">{t("stock")}</th>
                <th className="px-3 py-3 xl:px-4 text-start font-medium">{t("status")}</th>
                <th className="px-3 py-3 xl:px-4 text-end font-medium">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-sunken/60">
                  <td className="px-3 py-2.5 xl:px-4 max-md:col-span-2">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-accent">
                      <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-sunken">
                        {p.images[0] && <img src={mediaUrl(p.images[0].key)!} alt="" className="size-full object-cover" />}
                      </span>
                      <span className="font-medium">{localName(p, locale)}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 xl:px-4 text-muted">{p.category ? localName(p.category, locale) : "—"}</td>
                  <td className="px-3 py-2.5 xl:px-4 text-end whitespace-nowrap max-md:justify-self-end max-md:font-semibold">{formatPrice(p.price, locale)}</td>
                  <td data-label={t("stock")} className={`px-3 py-2.5 xl:px-4 text-end font-semibold tabular-nums max-md:text-start ${p.stock === 0 ? "text-danger" : p.stock <= 3 ? "text-accent" : ""}`}>
                    {p.stock}
                  </td>
                  <td className="px-3 py-2.5 xl:px-4 max-md:justify-self-end">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? "bg-success/10 text-success" : "bg-sunken text-muted"}`}>
                      {p.active ? t("active") : t("inactive")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 xl:px-4 max-md:col-span-2">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap max-md:mt-1 max-md:border-t max-md:border-line max-md:pt-2.5">
                      <Link href={`/admin/products/${p.id}`} className="btn-outline px-3.5 py-1.5" title={t("editShort")}>
                        <Pencil className="size-3.5" /> <span className="md:max-xl:sr-only">{t("editShort")}</span>
                      </Link>
                      <DeleteButton
                        label={t("deleteShort")}
                        confirmText={`${localName(p, locale)}\n\n${t("deleteConfirm")}`}
                        onDelete={deleteProduct.bind(null, p.id, true)}
                        labelClassName="md:max-xl:sr-only"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="p-8 text-center text-muted">{q ? t("noMatch") : t("empty")}</p>}
        </div>

        <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} href={pageHref} />
      </ListFilters>
    </>
  );
}
