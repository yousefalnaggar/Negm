import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildSearchText } from "../src/lib/normalize";
import { categories, products, RETIRED_CATEGORIES, RETIRED_PRODUCTS } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const UPLOADS = path.join(process.cwd(), "public", "uploads");

// Demo photos from Unsplash (free licence). Downloaded once and converted to WebP.
async function seedImage(photoId: string) {
  const key = `seed/${photoId}.webp`;
  const file = path.join(UPLOADS, key);
  if (!existsSync(file)) {
    const res = await fetch(`https://images.unsplash.com/photo-${photoId}?w=1600&q=85&fm=jpg`);
    if (!res.ok) throw new Error(`download failed: ${photoId}`);
    const data = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  const meta = await sharp(file).metadata();
  return { key, width: meta.width!, height: meta.height! };
}

async function main() {
  await db.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, storeNameAr: "نجم", storeNameEn: "NEGM", phone: "01000000000", shippingFee: 25000 },
  });

  await db.category.deleteMany({ where: { slug: { in: RETIRED_CATEGORIES } } });
  await db.product.updateMany({ where: { slug: { in: RETIRED_PRODUCTS } }, data: { active: false } });

  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const img = await seedImage(c.photo);
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn, imageKey: img.key, position: i },
    });
    catIds[c.slug] = row.id;
  }

  for (const p of products) {
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    const img = await seedImage(p.photo);
    await db.product.create({
      data: {
        slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, descriptionAr: p.descAr, descriptionEn: p.descEn,
        searchText: buildSearchText(p), price: p.price, compareAtPrice: p.compareAt, stock: p.stock,
        featured: p.featured ?? false, categoryId: catIds[p.cat],
        images: { create: { key: img.key, width: img.width, height: img.height, position: 0 } },
      },
    });
    console.log("product:", p.nameEn);
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    const existing = await db.user.findUnique({ where: { email } });
    if (!existing) {
      const id = randomBytes(16).toString("hex");
      await db.user.create({
        data: {
          id, email, name: "Admin", emailVerified: true, role: "admin",
          accounts: { create: { id: randomBytes(16).toString("hex"), accountId: id, providerId: "credential", password: await hashPassword(password) } },
        },
      });
      console.log("admin created:", email);
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
