"use client";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { deleteCategory, type FormState, saveCategory } from "@/actions/admin";
import { DeleteButton } from "./delete-button";

type ErrorKey = Parameters<ReturnType<typeof useTranslations<"errors">>>[0];
type Category = { id: string; nameAr: string; nameEn: string; slug: string; count: number; imageUrl: string | null };

/** Square thumbnail that opens the file picker and previews the chosen photo before saving. */
function PhotoPicker({ current, label }: { current: string | null; label: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const src = preview ?? current;
  return (
    <label
      title={label}
      className="grid size-11 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-sunken text-muted transition-colors hover:border-accent hover:text-accent has-focus-visible:ring-2 has-focus-visible:ring-accent"
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5" strokeWidth={1.75} />}
      <input
        type="file"
        name="image"
        accept="image/jpeg,image/png,image/webp"
        aria-label={label}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </label>
  );
}

export function CategoryForm({ category }: { category?: Category }) {
  const t = useTranslations("admin.categoriesPage");
  const tErr = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory.bind(null, category?.id ?? null), {});
  const err = (f: string) => state.fields?.[f] && <p className="mt-1 text-xs text-danger">{tErr(state.fields[f] as ErrorKey)}</p>;

  return (
    // Remount after a save so the file input clears: new form on success, existing one when its photo changes.
    <form
      action={action}
      key={category ? (category.imageUrl ?? "") : String(state.ok)}
      className="grid items-start gap-3 p-4 sm:grid-cols-[auto_1fr_1fr] xl:grid-cols-[auto_1fr_1fr_1fr_auto]"
    >
      <PhotoPicker current={category?.imageUrl ?? null} label={t("photo")} />
      <div>
        <input name="nameAr" defaultValue={category?.nameAr} placeholder={t("nameAr")} aria-label={t("nameAr")} required dir="rtl" className="input" />
        {err("nameAr")}
      </div>
      <div>
        <input name="nameEn" defaultValue={category?.nameEn} placeholder={t("nameEn")} aria-label={t("nameEn")} required dir="ltr" className="input" />
        {err("nameEn")}
      </div>
      {/* Two rows below 1280px (photo + names, then slug + buttons), one row above. */}
      <div className="sm:col-start-2 xl:col-start-auto">
        <input name="slug" defaultValue={category?.slug} placeholder={t("slug")} aria-label={t("slug")} dir="ltr" className="input" />
        {err("slug")}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="submit" disabled={pending} className={category ? "btn-outline" : "btn-primary"}>
          {category ? t("save") : t("add")}
        </button>
        {category && (
          <DeleteButton label={`${t("delete")} (${category.count})`} confirmText={t("deleteConfirm")} onDelete={() => deleteCategory(category.id)} />
        )}
      </div>
      {state.fields?.image && <div className="-mt-2 sm:col-span-3 xl:col-span-5">{err("image")}</div>}
    </form>
  );
}
