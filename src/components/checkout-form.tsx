"use client";

import { Banknote } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { type CheckoutState, placeOrder } from "@/actions/checkout";
import { GOVERNORATES } from "@/lib/governorates";

type ErrorKey = Parameters<ReturnType<typeof useTranslations<"errors">>>[0];

export function CheckoutForm({ idempotencyKey }: { idempotencyKey: string }) {
  const t = useTranslations("checkout");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const v = state.values ?? {};
  const err = (f: string) => state.fields?.[f];

  const field = (name: string, label: string, opts: { type?: string; optional?: boolean; hint?: string; autoComplete?: string; inputMode?: "tel" | "email"; dir?: "ltr" } = {}) => (
    <div>
      <label htmlFor={name} className="label">
        {label} {opts.optional && <span className="font-normal text-muted">({t("optional")})</span>}
      </label>
      <input
        id={name}
        name={name}
        type={opts.type ?? "text"}
        defaultValue={v[name]}
        required={!opts.optional}
        autoComplete={opts.autoComplete}
        inputMode={opts.inputMode}
        dir={opts.dir}
        aria-invalid={!!err(name)}
        aria-describedby={err(name) ? `${name}-error` : undefined}
        className="input"
      />
      {err(name) ? (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-danger">{tErr(err(name) as ErrorKey)}</p>
      ) : opts.hint ? (
        <p className="mt-1.5 text-xs text-muted">{opts.hint}</p>
      ) : null}
    </div>
  );

  // Remount inputs after each response so defaultValue reflects what was submitted.
  const formKey = JSON.stringify(state.values ?? {});

  return (
    <form action={action} key={formKey} className="space-y-10" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {state.error && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {tErr(state.error as ErrorKey)}
        </p>
      )}

      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-4 font-display text-2xl font-bold">{t("contact")}</legend>
        {field("name", t("fullName"), { autoComplete: "name" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("phone", t("phone"), { type: "tel", inputMode: "tel", autoComplete: "tel", hint: t("phoneHint"), dir: "ltr" })}
          {field("email", t("email"), { type: "email", inputMode: "email", autoComplete: "email", optional: true, dir: "ltr" })}
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-4 font-display text-2xl font-bold">{t("delivery")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="governorate" className="label">{t("governorate")}</label>
            <select
              id="governorate"
              name="governorate"
              defaultValue={v.governorate ?? ""}
              required
              aria-invalid={!!err("governorate")}
              className="input"
            >
              <option value="" disabled>{t("choose")}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.code} value={g.code}>{locale === "ar" ? g.ar : g.en}</option>
              ))}
            </select>
            {err("governorate") && <p className="mt-1.5 text-xs text-danger">{tErr(err("governorate") as ErrorKey)}</p>}
          </div>
          {field("city", t("city"), { autoComplete: "address-level2" })}
        </div>
        {field("address", t("address"), { autoComplete: "street-address" })}
        <div>
          <label htmlFor="notes" className="label">
            {t("notes")} <span className="font-normal text-muted">({t("optional")})</span>
          </label>
          <textarea id="notes" name="notes" rows={3} defaultValue={v.notes} maxLength={500} className="input" />
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-4 font-display text-2xl font-bold">{t("payment")}</legend>
        <div className="flex items-start gap-4 rounded-2xl border-2 border-ink bg-surface p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Banknote className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-semibold">{t("cod")}</p>
            <p className="text-sm text-muted">{t("codHint")}</p>
          </div>
        </div>
      </fieldset>

      <div>
        <button type="submit" disabled={pending} className="btn-primary w-full py-4 text-base">
          {pending ? t("placing") : t("placeOrder")}
        </button>
        <p className="mt-3 text-center text-xs text-muted">{t("terms")}</p>
      </div>
    </form>
  );
}
