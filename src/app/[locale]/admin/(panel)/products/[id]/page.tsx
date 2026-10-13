import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { deleteProduct } from "@/actions/admin";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { db } from "@/lib/db";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";

const toPounds = (p: number | null) => (p == null ? "" : String(p / 100));

export default async function EditProductPage({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const product = await db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } } } });
  if (!product) notFound();
  const [t, tAdmin, categories] = await Promise.all([
    getTranslations("admin.productsPage"),
    getTranslations("admin"),
    getCategories(),
  ]);

  return (
    <>
      <Link href="/admin/products" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" /> {tAdmin("products")}
      </Link>
      <PageHeader title={localName(product, locale)}>
        {product.active && (
          <Link href={`/product/${product.slug}`} target="_blank" className="btn-outline">
            <ExternalLink className="size-4" /> {tAdmin("viewStore")}
          </Link>
        )}
      </PageHeader>
      <div className="space-y-6">
        <ImageManager productId={product.id} images={product.images.map((i) => ({ id: i.id, url: mediaUrl(i.key)! }))} />
        <ProductForm
          productId={product.id}
          categories={categories.map((c) => ({ id: c.id, name: localName(c, locale) }))}
          initial={{
            nameAr: product.nameAr,
            nameEn: product.nameEn,
            descriptionAr: product.descriptionAr ?? "",
            descriptionEn: product.descriptionEn ?? "",
            slug: product.slug,
            price: toPounds(product.price),
            compareAtPrice: toPounds(product.compareAtPrice),
            stock: String(product.stock),
            categoryId: product.categoryId ?? "",
            active: product.active,
            featured: product.featured,
          }}
        />
        <div className="border-t border-line pt-6">
          <DeleteButton label={t("delete")} confirmText={t("deleteConfirm")} onDelete={deleteProduct.bind(null, product.id)} />
        </div>
      </div>
    </>
  );
}
