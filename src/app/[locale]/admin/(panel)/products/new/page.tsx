import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { localName } from "@/lib/localized";

export default async function NewProductPage({ params }: PageProps<"/[locale]/admin/products/new">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
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
      <PageHeader title={t("new")} />
      <ProductForm
        productId={null}
        categories={categories.map((c) => ({ id: c.id, name: localName(c, locale) }))}
        initial={{ nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", slug: "", price: "", compareAtPrice: "", stock: "0", categoryId: "", active: true, featured: false }}
      />
      <p className="mt-6 text-sm text-muted">{t("saveFirst")}</p>
    </>
  );
}
