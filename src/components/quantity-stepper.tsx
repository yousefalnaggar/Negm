"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
  disabled,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  min?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const t = useTranslations("product");
  const btn = `grid place-items-center text-ink transition-colors hover:bg-sunken disabled:opacity-40 ${size === "sm" ? "size-8" : "size-11"}`;
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-surface">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={t("decrease")}>
        <Minus className="size-3.5" />
      </button>
      <span className={`text-center text-sm font-semibold tabular-nums ${size === "sm" ? "w-7" : "w-9"}`} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={t("increase")}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
