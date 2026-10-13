"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
import { Link } from "@/i18n/navigation";
import { QuantityStepper } from "./quantity-stepper";

export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const t = useTranslations("product");
  const tErr = useTranslations("errors");
  const [qty, setQty] = useState(1);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; error?: string } | null>(null);

  if (stock <= 0) {
    return (
      <button type="button" disabled className="btn-dark w-full py-3.5">
        {t("outOfStock")}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <QuantityStepper value={qty} onChange={setQty} max={Math.min(stock, 20)} disabled={pending} />
        <button
          type="button"
          disabled={pending}
          className="btn-primary flex-1 py-3"
          onClick={() =>
            start(async () => {
              const res = await addToCart(productId, qty);
              setStatus(res.ok ? { ok: true } : { ok: false, error: res.error });
            })
          }
        >
          {pending ? t("adding") : t("addToCart")}
        </button>
      </div>
      {status?.ok && (
        <p className="flex items-center justify-between gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm" role="status">
          <span className="flex items-center gap-2 font-medium">
            <Check className="size-4 text-success" /> {t("added")}
          </span>
          <Link href="/cart" className="font-semibold text-accent underline-offset-4 hover:underline">
            {t("viewCart")}
          </Link>
        </p>
      )}
      {status && !status.ok && (
        <p className="text-sm text-danger" role="alert">
          {tErr(status.error === "outOfStock" ? "outOfStock" : status.error === "rateLimited" ? "rateLimited" : "generic")}
        </p>
      )}
    </div>
  );
}
