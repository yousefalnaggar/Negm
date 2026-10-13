"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCartToken } from "@/lib/cart";
import { db } from "@/lib/db";
import { notifyNewOrder } from "@/lib/notify";
import { CheckoutError, createOrderFromCart } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, fieldErrors } from "@/lib/validation";

export type CheckoutState = {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
};

const FIELDS = ["name", "phone", "email", "governorate", "city", "address", "notes", "idempotencyKey"] as const;

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const locale = await getLocale();
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));

  // Honeypot: real people never fill this hidden field.
  if (formData.get("website")) return { error: "generic", values };

  if (!rateLimit(`checkout:${await clientIp()}`, 8, 10 * 60_000)) return { error: "rateLimited", values };

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error), values };

  const token = await getCartToken();
  if (!token) return { error: "emptyCart", values };

  let publicToken: string;
  try {
    const order = await createOrderFromCart(token, parsed.data, locale);
    publicToken = order.publicToken;
    await notifyNewOrder(order.id);
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.code, values };
    // Two submits with the same key raced: the unique index caught the second one.
    const dupe = await db.order.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } });
    if (!dupe) {
      console.error("[checkout] order failed", { message: (err as Error).message });
      return { error: "generic", values };
    }
    publicToken = dupe.publicToken;
  }

  revalidatePath("/", "layout");
  redirect({ href: `/order/${publicToken}`, locale });
  return {};
}
