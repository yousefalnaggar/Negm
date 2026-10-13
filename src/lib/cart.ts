import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { env } from "./env";

const COOKIE = "cart";

export async function getCartToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from Server Actions (sets a cookie). */
export async function getOrCreateCart() {
  const token = await getCartToken();
  if (token) {
    const cart = await db.cart.findUnique({ where: { token } });
    if (cart) return cart;
  }
  const cart = await db.cart.create({ data: { token: randomBytes(32).toString("base64url") } });
  (await cookies()).set(COOKIE, cart.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart;
}

/** Cart with live prices from the database. Inactive products are dropped from totals. */
export const getCart = cache(async () => {
  const token = await getCartToken();
  if (!token) return null;
  return db.cart.findUnique({
    where: { token },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
        },
      },
    },
  });
});

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCart>>>;

export function cartTotals(cart: CartWithItems | null, shippingFee: number) {
  const items = (cart?.items ?? []).filter((i) => i.product.active);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const shipping = items.length ? shippingFee : 0;
  return { items, subtotal, count, shipping, total: subtotal + shipping };
}

export async function getCartCount() {
  const token = await getCartToken();
  if (!token) return 0;
  const agg = await db.cartItem.aggregate({
    where: { cart: { token }, product: { active: true } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}
