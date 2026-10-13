"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { normalizeDigits } from "@/lib/normalize";

const MAX = 100_000;

/** Digits-only stock field with −/+ buttons that step by one. */
export function StockInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  const t = useTranslations("product");
  const [value, setValue] = useState(Number(defaultValue) || 0);
  const set = (n: number) => setValue(Math.min(MAX, Math.max(0, n)));
  const btn = "grid size-11 shrink-0 place-items-center text-ink transition-colors hover:bg-sunken disabled:opacity-40";

  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-line bg-surface focus-within:border-accent" dir="ltr">
      <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= 0} aria-label={t("decrease")}>
        <Minus className="size-4" />
      </button>
      <input
        name={name}
        value={value}
        onChange={(e) => set(Number(normalizeDigits(e.target.value).replace(/\D/g, "")) || 0)}
        inputMode="numeric"
        pattern="[0-9]*"
        className="h-11 min-w-0 flex-1 border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums focus:outline-none"
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= MAX} aria-label={t("increase")}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
