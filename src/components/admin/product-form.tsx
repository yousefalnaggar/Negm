"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type FormState, saveProduct } from "@/actions/admin";
import { StockInput } from "./stock-input";
import { Field } from "./ui";

type ErrorKey = Parameters<ReturnType<typeof useTranslations<"errors">>>[0];

export type ProductFormValues = {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  slug: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  categoryId: string;
  active: boolean;
  featured: boolean;
};

export function ProductForm({
  productId,
  initial,
  categories,
}: {
  productId: string | null;
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
}) {
  const t = useTranslations("admin.productsPage");
  const tErr = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct.bind(null, productId), {});
  const err = (f: string) => (state.fields?.[f] ? tErr(state.fields[f] as ErrorKey) : undefined);

  return (
    <form action={action} className="space-y-6">
      {state.error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{tErr(state.error as ErrorKey)}</p>}
      {state.ok && !pending && <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("saved")}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card space-y-4 p-5" dir="rtl" lang="ar">
          <p className="text-xs font-semibold text-muted">{t("arabic")}</p>
          <Field label={t("nameAr")} error={err("nameAr")}>
            <input name="nameAr" defaultValue={initial.nameAr} required className="input" />
          </Field>
          <Field label={t("descriptionAr")} error={err("descriptionAr")}>
            <textarea name="descriptionAr" defaultValue={initial.descriptionAr} rows={5} className="input" />
          </Field>
        </section>
        <section className="card space-y-4 p-5" dir="ltr" lang="en">
          <p className="text-xs font-semibold text-muted">{t("english")}</p>
          <Field label={t("nameEn")} error={err("nameEn")}>
            <input name="nameEn" defaultValue={initial.nameEn} required className="input" />
          </Field>
          <Field label={t("descriptionEn")} error={err("descriptionEn")}>
            <textarea name="descriptionEn" defaultValue={initial.descriptionEn} rows={5} className="input" />
          </Field>
        </section>
      </div>

      <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("priceEgp")} error={err("price")}>
          <input name="price" defaultValue={initial.price} inputMode="decimal" required className="input" dir="ltr" />
        </Field>
        <Field label={t("compareAt")} error={err("compareAtPrice")} hint={t("compareAtHint")}>
          <input name="compareAtPrice" defaultValue={initial.compareAtPrice} inputMode="decimal" className="input" dir="ltr" />
        </Field>
        <Field label={t("stock")} error={err("stock")}>
          <StockInput name="stock" defaultValue={initial.stock} />
        </Field>
        <Field label={t("category")}>
          <select name="categoryId" defaultValue={initial.categoryId} className="input">
            <option value="">{t("noCategory")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("slug")} error={err("slug")} hint={t("slugHint")}>
          <input name="slug" defaultValue={initial.slug} className="input" dir="ltr" />
        </Field>
        <div className="flex flex-col justify-center gap-3 pt-2">
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="active" defaultChecked={initial.active} className="size-4 accent-accent" /> {t("visible")}
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="featured" defaultChecked={initial.featured} className="size-4 accent-accent" /> {t("featured")}
          </label>
        </div>
      </section>

      <button type="submit" disabled={pending} className="btn-primary px-8">
        {pending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
