"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import type { OrderStatus } from "@/generated/prisma/client";
import { redirect } from "@/i18n/navigation";
import { auth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSearchText, slugify } from "@/lib/normalize";
import { changeOrderStatus } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { deleteObject, ImageError, newProductImageKey, processImage, putObject } from "@/lib/storage";
import { categorySchema, fieldErrors, productSchema, settingsSchema } from "@/lib/validation";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: boolean; email?: string };

async function localeRedirect(href: string): Promise<never> {
  return redirect({ href, locale: await getLocale() });
}

function refreshAll() {
  revalidatePath("/", "layout");
}

// ---------- Auth ----------

const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) });

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const typed = String(formData.get("email") ?? "").slice(0, 200);
  if (!parsed.success) return { error: "invalid", email: typed };

  const ip = await clientIp();
  const email = parsed.data.email.toLowerCase();
  // Throttle by IP and by account so guessing is slow either way.
  if (!rateLimit(`login-ip:${ip}`, 20, 15 * 60_000) || !rateLimit(`login-email:${email}`, 5, 15 * 60_000)) {
    return { error: "rateLimited", email: typed };
  }

  try {
    await auth.api.signInEmail({ body: { email, password: parsed.data.password }, headers: await headers() });
  } catch {
    return { error: "invalid", email: typed };
  }
  return localeRedirect("/admin");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  return localeRedirect("/admin/login");
}

// ---------- Orders ----------

const statusSchema = z.enum(["NEW", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]);

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success || typeof orderId !== "string") return { ok: false };
  const ok = await changeOrderStatus(orderId, parsed.data);
  refreshAll();
  return { ok };
}

// ---------- Products ----------

export async function saveProduct(productId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = Object.fromEntries(
    ["nameAr", "nameEn", "descriptionAr", "descriptionEn", "slug", "price", "compareAtPrice", "stock", "categoryId"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const parsed = productSchema.safeParse({ ...raw, active: formData.get("active") === "on", featured: formData.get("featured") === "on" });
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  const slug = d.slug || slugify(d.nameEn) || `product-${Date.now()}`;
  const clash = await db.product.findFirst({ where: { slug, NOT: productId ? { id: productId } : undefined } });
  if (clash) return { error: "fixFields", fields: { slug: "slugTaken" } };

  const data = {
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    descriptionAr: d.descriptionAr,
    descriptionEn: d.descriptionEn,
    slug,
    searchText: buildSearchText(d),
    price: d.price!,
    compareAtPrice: d.compareAtPrice,
    stock: d.stock,
    categoryId: d.categoryId,
    active: d.active,
    featured: d.featured,
  };

  if (productId) {
    await db.product.update({ where: { id: productId }, data });
    refreshAll();
    return { ok: true };
  }
  const created = await db.product.create({ data });
  refreshAll();
  return localeRedirect(`/admin/products/${created.id}`);
}

export async function deleteProduct(productId: string) {
  await requireAdmin();
  const images = await db.productImage.findMany({ where: { productId } });
  await db.product.delete({ where: { id: productId } });
  await Promise.all(images.map((i) => deleteObject(i.key)));
  refreshAll();
  return localeRedirect("/admin/products");
}

// ---------- Product images ----------

export async function uploadProductImage(productId: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "invalidImage" };

  if (typeof productId !== "string" || !(await db.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
    return { error: "generic" };
  }
  const count = await db.productImage.count({ where: { productId } });
  if (count >= 10) return { error: "tooManyImages" };

  try {
    const img = await processImage(Buffer.from(await file.arrayBuffer()));
    const key = newProductImageKey(productId);
    await putObject(key, img.data);
    await db.productImage.create({ data: { productId, key, width: img.width, height: img.height, position: count } });
  } catch (err) {
    if (err instanceof ImageError) return { error: err.message };
    console.error("[upload] failed", { productId, message: (err as Error).message });
    return { error: "generic" };
  }
  refreshAll();
  return {};
}

export async function moveProductImage(imageId: string, direction: -1 | 1) {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  const all = await db.productImage.findMany({ where: { productId: image.productId }, orderBy: { position: "asc" } });
  const i = all.findIndex((x) => x.id === imageId);
  const j = i + (direction === -1 ? -1 : 1);
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, position) => db.productImage.update({ where: { id: x.id }, data: { position } })));
  refreshAll();
}

export async function deleteProductImage(imageId: string) {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  await db.productImage.delete({ where: { id: imageId } });
  await deleteObject(image.key);
  refreshAll();
}

// ---------- Categories ----------

export async function saveCategory(categoryId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    nameAr: String(formData.get("nameAr") ?? ""),
    nameEn: String(formData.get("nameEn") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };
  const slug = parsed.data.slug || slugify(parsed.data.nameEn) || `category-${Date.now()}`;
  const clash = await db.category.findFirst({ where: { slug, NOT: categoryId ? { id: categoryId } : undefined } });
  if (clash) return { error: "fixFields", fields: { slug: "slugTaken" } };

  const data = { nameAr: parsed.data.nameAr, nameEn: parsed.data.nameEn, slug };
  if (categoryId) await db.category.update({ where: { id: categoryId }, data });
  else await db.category.create({ data: { ...data, position: await db.category.count() } });
  refreshAll();
  return { ok: true };
}

export async function deleteCategory(categoryId: string) {
  await requireAdmin();
  await db.category.delete({ where: { id: categoryId } });
  refreshAll();
}

// ---------- Settings ----------

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    storeNameAr: String(formData.get("storeNameAr") ?? ""),
    storeNameEn: String(formData.get("storeNameEn") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    shippingFee: String(formData.get("shippingFee") ?? ""),
  });
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };
  const data = { ...parsed.data, shippingFee: parsed.data.shippingFee! };
  await db.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  refreshAll();
  return { ok: true };
}
