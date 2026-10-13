"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { deleteCategory, type FormState, saveCategory } from "@/actions/admin";
import { DeleteButton } from "./delete-button";

type ErrorKey = Parameters<ReturnType<typeof useTranslations<"errors">>>[0];
type Category = { id: string; nameAr: string; nameEn: string; slug: string; count: number };

export function CategoryForm({ category }: { category?: Category }) {
  const t = useTranslations("admin.categoriesPage");
  const tErr = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory.bind(null, category?.id ?? null), {});
  const err = (f: string) => state.fields?.[f] && <p className="mt-1 text-xs text-danger">{tErr(state.fields[f] as ErrorKey)}</p>;

  return (
    <form action={action} key={category ? undefined : String(state.ok)} className="grid items-start gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <div>
        <input name="nameAr" defaultValue={category?.nameAr} placeholder={t("nameAr")} aria-label={t("nameAr")} required dir="rtl" className="input" />
        {err("nameAr")}
      </div>
      <div>
        <input name="nameEn" defaultValue={category?.nameEn} placeholder={t("nameEn")} aria-label={t("nameEn")} required dir="ltr" className="input" />
        {err("nameEn")}
      </div>
      <div>
        <input name="slug" defaultValue={category?.slug} placeholder={t("slug")} aria-label={t("slug")} dir="ltr" className="input" />
        {err("slug")}
      </div>
      <div className="flex items-center gap-1">
        <button type="submit" disabled={pending} className={category ? "btn-outline" : "btn-primary"}>
          {category ? t("save") : t("add")}
        </button>
        {category && (
          <DeleteButton label={`${t("delete")} (${category.count})`} confirmText={t("deleteConfirm")} onDelete={() => deleteCategory(category.id)} />
        )}
      </div>
    </form>
  );
}
