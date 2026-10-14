import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryForm } from "@/components/admin/category-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";

export default async function CategoriesPage({ params }: PageProps<"/[locale]/admin/categories">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const [t, tAdmin, categories] = await Promise.all([
    getTranslations("admin.categoriesPage"),
    getTranslations("admin"),
    db.category.findMany({ orderBy: [{ position: "asc" }, { nameEn: "asc" }], include: { _count: { select: { products: true } } } }),
  ]);

  return (
    <>
      <PageHeader title={tAdmin("categories")} count={tAdmin("counts.categories", { count: categories.length })} />
      <div className="card mb-6">
        <CategoryForm />
      </div>
      <div className="card divide-y divide-line">
        {categories.map((c) => (
          <CategoryForm key={c.id} category={{ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, slug: c.slug, count: c._count.products, imageUrl: mediaUrl(c.imageKey) }} />
        ))}
        {categories.length === 0 && <p className="p-8 text-center text-muted">{t("empty")}</p>}
      </div>
    </>
  );
}
