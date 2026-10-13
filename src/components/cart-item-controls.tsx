"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateCartItem } from "@/actions/cart";
import { QuantityStepper } from "./quantity-stepper";

export function CartItemControls({ itemId, quantity, max }: { itemId: string; quantity: number; max: number }) {
  const t = useTranslations("cart");
  const tErr = useTranslations("errors");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (q: number) =>
    start(async () => {
      const res = await updateCartItem(itemId, q);
      setError(res.ok ? null : tErr(res.error));
    });

  return (
    <div className={`flex flex-wrap items-center gap-3 ${pending ? "opacity-60" : ""}`}>
      {max > 0 && <QuantityStepper size="sm" value={quantity} onChange={set} max={Math.min(Math.max(max, quantity), 20)} disabled={pending} />}
      <button type="button" onClick={() => set(0)} disabled={pending} className="text-sm text-muted underline-offset-4 hover:text-danger hover:underline">
        {t("remove")}
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}
