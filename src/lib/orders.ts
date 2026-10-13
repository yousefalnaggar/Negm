import "server-only";
import { randomBytes } from "node:crypto";
import type { OrderStatus } from "@/generated/prisma/client";
import { db } from "./db";
import type { CheckoutInput } from "./validation";

export class CheckoutError extends Error {
  constructor(public code: "emptyCart" | "outOfStock") {
    super(code);
  }
}

/**
 * Turns the cart into an order in one transaction: prices come from the database,
 * stock is decremented only if enough is left, and the cart is emptied.
 */
export async function createOrderFromCart(cartToken: string, input: CheckoutInput, locale: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;

    const cart = await tx.cart.findUnique({
      where: { token: cartToken },
      include: {
        items: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } },
      },
    });
    const items = cart?.items ?? [];
    if (!cart || items.length === 0) throw new CheckoutError("emptyCart");

    for (const item of items) {
      const { count } = await tx.product.updateMany({
        where: { id: item.productId, active: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (count !== 1) throw new CheckoutError("outOfStock");
    }

    const settings = await tx.setting.findUnique({ where: { id: 1 } });
    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const shippingFee = settings?.shippingFee ?? 0;

    const order = await tx.order.create({
      data: {
        publicToken: randomBytes(24).toString("base64url"),
        idempotencyKey: input.idempotencyKey,
        locale,
        customerName: input.name,
        phone: input.phone,
        email: input.email,
        governorate: input.governorate,
        city: input.city,
        address: input.address,
        notes: input.notes,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            nameAr: i.product.nameAr,
            nameEn: i.product.nameEn,
            imageKey: i.product.images[0]?.key ?? null,
            unitPrice: i.product.price,
            quantity: i.quantity,
            lineTotal: i.product.price * i.quantity,
          })),
        },
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return order;
  });
}

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Moves an order along the flow. Cancelling puts the items back in stock. */
export async function changeOrderStatus(orderId: string, next: OrderStatus) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || !STATUS_FLOW[order.status].includes(next)) return false;

    // Guard against a concurrent change: only update if the status is still what we read.
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: next } });
    if (count !== 1) return false;

    if (next === "CANCELLED") {
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
    }
    return true;
  });
}
