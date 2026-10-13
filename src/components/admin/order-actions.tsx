"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { setOrderStatus } from "@/actions/admin";
import type { OrderStatus } from "@/generated/prisma/enums";

export function OrderActions({ orderId, next }: { orderId: string; next: OrderStatus[] }) {
  const t = useTranslations("admin.ordersPage");
  const tStatus = useTranslations("status");
  const [pending, start] = useTransition();

  const forward = next.filter((s) => s !== "CANCELLED");
  const canCancel = next.includes("CANCELLED");

  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await setOrderStatus(orderId, s)))}
          className="btn-primary"
        >
          {t("moveTo", { status: tStatus(s) })}
        </button>
      ))}
      {canCancel && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(t("cancelConfirm"))) start(async () => void (await setOrderStatus(orderId, "CANCELLED")));
          }}
          className="btn-ghost text-danger"
        >
          {t("cancel")}
        </button>
      )}
    </div>
  );
}
