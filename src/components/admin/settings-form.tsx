"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type FormState, saveSettings } from "@/actions/admin";
import { Field } from "./ui";

type ErrorKey = Parameters<ReturnType<typeof useTranslations<"errors">>>[0];

export function SettingsForm({ initial }: { initial: { storeNameAr: string; storeNameEn: string; phone: string; shippingFee: string } }) {
  const t = useTranslations("admin.settingsPage");
  const tErr = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const err = (f: string) => (state.fields?.[f] ? tErr(state.fields[f] as ErrorKey) : undefined);

  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      {state.ok && !pending && <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("saved")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("storeNameAr")} error={err("storeNameAr")}>
          <input name="storeNameAr" defaultValue={initial.storeNameAr} required dir="rtl" className="input" />
        </Field>
        <Field label={t("storeNameEn")} error={err("storeNameEn")}>
          <input name="storeNameEn" defaultValue={initial.storeNameEn} required dir="ltr" className="input" />
        </Field>
        <Field label={t("phone")} error={err("phone")}>
          <input name="phone" defaultValue={initial.phone} inputMode="tel" dir="ltr" className="input" />
        </Field>
        <Field label={t("shippingFee")} error={err("shippingFee")}>
          <input name="shippingFee" defaultValue={initial.shippingFee} inputMode="decimal" required dir="ltr" className="input" />
        </Field>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">{t("save")}</button>
    </form>
  );
}
