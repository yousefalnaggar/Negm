"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCartToken, getOrCreateCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type Result = { ok: true } | { ok: false; error: "outOfStock" | "generic" | "rateLimited" };

const MAX_QTY = 20;
const addSchema = z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(MAX_QTY) });
const updateSchema = z.object({ itemId: z.string().min(1).max(40), quantity: z.number().int().min(0).max(MAX_QTY) });

async function allowed() {
  return rateLimit(`cart:${await clientIp()}`, 60, 60_000);
}

export async function addToCart(productId: string, quantity: number): Promise<Result> {
  if (!(await allowed())) return { ok: false, error: "rateLimited" };
  const input = addSchema.safeParse({ productId, quantity });
  if (!input.success) return { ok: false, error: "generic" };

  const product = await db.product.findUnique({ where: { id: input.data.productId } });
  if (!product || !product.active) return { ok: false, error: "generic" };

  const cart = await getOrCreateCart();
  const existing = await db.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
  });
  const wanted = Math.min((existing?.quantity ?? 0) + input.data.quantity, MAX_QTY);
  if (wanted > product.stock) return { ok: false, error: "outOfStock" };

  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    create: { cartId: cart.id, productId: product.id, quantity: wanted },
    update: { quantity: wanted },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Result> {
  if (!(await allowed())) return { ok: false, error: "rateLimited" };
  const input = updateSchema.safeParse({ itemId, quantity });
  const token = await getCartToken();
  if (!input.success || !token) return { ok: false, error: "generic" };

  // Scope by cart token so nobody can touch another visitor's cart.
  const item = await db.cartItem.findFirst({
    where: { id: input.data.itemId, cart: { token } },
    include: { product: true },
  });
  if (!item) return { ok: false, error: "generic" };

  if (input.data.quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    if (input.data.quantity > item.product.stock) return { ok: false, error: "outOfStock" };
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: input.data.quantity } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
