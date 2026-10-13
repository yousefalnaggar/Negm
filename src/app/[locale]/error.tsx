"use client";

import { useTranslations } from "next-intl";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="font-display text-3xl">{t("generic")}</p>
        <button type="button" onClick={reset} className="btn-outline mt-6">↻</button>
      </div>
    </main>
  );
}
