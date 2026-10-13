"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type FormState, login } from "@/actions/admin";

export function LoginForm() {
  const t = useTranslations("admin.login");
  const tErr = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {state.error === "rateLimited" ? tErr("rateLimited") : t("invalid")}
        </p>
      )}
      <div>
        <label htmlFor="email" className="label">{t("email")}</label>
        <input id="email" name="email" type="email" defaultValue={state.email} required autoComplete="username" dir="ltr" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">{t("password")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" autoFocus={!!state.email} dir="ltr" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-dark w-full py-3">
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
