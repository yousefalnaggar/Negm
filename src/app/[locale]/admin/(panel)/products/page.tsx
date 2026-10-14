import { Pencil, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { deleteProduct } from "@/actions/admin";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import { normalizeSearch } from "@/lib/normalize";

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/admin/products">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 100) : "";
  const where: Prisma.ProductWhereInput = q ? { searchText: { contains: normalizeSearch(q), mode: "insensitive" } } : {};

  const [t, tAdmin, products] = await Promise.all([
    getTranslations("admin.productsPage"),
    getTranslations("admin"),
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, category: true },
    }),
  ]);

  return (
    <>
      <PageHeader title={tAdmin("products")} count={tAdmin("counts.products", { count: products.length })}>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="size-4" /> {t("new")}
        </Link>
      </PageHeader>

      <form action="" className="mb-4 max-w-sm">
        <input name="q" defaultValue={q} placeholder={t("search")} className="input" />
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("category")}</th>
              <th className="px-4 py-3 text-end font-medium">{t("price")}</th>
              <th className="px-4 py-3 text-end font-medium">{t("stock")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
              <th className="px-4 py-3 text-end font-medium">
                <span className="sr-only">{t("actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-sunken/60">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-accent">
                    <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-sunken">
                      {p.images[0] && <img src={mediaUrl(p.images[0].key)!} alt="" className="size-full object-cover" />}
                    </span>
                    <span className="font-medium">{localName(p, locale)}</span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted">{p.category ? localName(p.category, locale) : "—"}</td>
                <td className="px-4 py-2.5 text-end whitespace-nowrap">{formatPrice(p.price, locale)}</td>
                <td className={`px-4 py-2.5 text-end font-semibold tabular-nums ${p.stock === 0 ? "text-danger" : p.stock <= 3 ? "text-accent" : ""}`}>
                  {p.stock}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? "bg-success/10 text-success" : "bg-sunken text-muted"}`}>
                    {p.active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Link href={`/admin/products/${p.id}`} className="btn-outline px-3.5 py-1.5">
                      <Pencil className="size-3.5" /> {t("editShort")}
                    </Link>
                    <DeleteButton
                      label={t("deleteShort")}
                      confirmText={`${localName(p, locale)}\n\n${t("deleteConfirm")}`}
                      onDelete={deleteProduct.bind(null, p.id, true)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="p-8 text-center text-muted">{t("empty")}</p>}
      </div>
    </>
  );
}
