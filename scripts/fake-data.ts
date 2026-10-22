// Dev only: fills the database with fake products, customers and orders for testing.
// Rows are tagged (product slug and order idempotencyKey start with "test-") so they can be removed.
// Usage: npx tsx scripts/fake-data.ts           add 100 products + 100 customers/orders
//        npx tsx scripts/fake-data.ts --orders  add 100 customers/orders from the existing products
//        npx tsx scripts/fake-data.ts --clean   remove everything this script added
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type OrderStatus } from "../src/generated/prisma/client";
import { GOVERNORATES } from "../src/lib/governorates";
import { buildSearchText } from "../src/lib/normalize";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const STYLES = [
  ["أطلس", "Atlas"], ["نوفا", "Nova"], ["فيرتكس", "Vertex"], ["لوفت", "Loft"], ["سييرا", "Sierra"],
  ["أوربت", "Orbit"], ["نورد", "Nord"], ["بلس", "Pulse"], ["كوست", "Coast"], ["زينيث", "Zenith"],
] as const;
const TYPES: Record<string, (readonly [string, string])[]> = {
  "gaming-chairs": [["كرسي جيمنج", "Gaming Chair"], ["كرسي ريسنج", "Racing Chair"]],
  "office-chairs": [["كرسي مكتب", "Office Chair"], ["كرسي شبك", "Mesh Chair"]],
  "office-desks": [["مكتب", "Desk"], ["مكتب بأدراج", "Drawer Desk"]],
  "gaming-desks": [["مكتب جيمنج", "Gaming Desk"], ["مكتب بإضاءة", "RGB Desk"]],
  "meeting-tables": [["ترابيزة اجتماعات", "Meeting Table"]],
  "storage-shelving": [["مكتبة", "Bookcase"], ["وحدة تخزين", "Storage Unit"]],
};
const COLORS = [["أسود", "Black"], ["أبيض", "White"], ["رمادي", "Grey"], ["بني", "Walnut"], ["أزرق", "Blue"]] as const;

const FIRST = ["Ahmed", "Mohamed", "Omar", "Youssef", "Mahmoud", "Mostafa", "Karim", "Hassan", "Ali", "Tarek",
  "Mona", "Sara", "Nour", "Salma", "Hana", "Yasmin", "Mariam", "Laila", "Dina", "Farida"];
const LAST = ["Hassan", "Ibrahim", "Saeed", "Fathy", "Mansour", "Adel", "Nabil", "Samir", "Fouad", "Ezzat"];
const STREETS = ["Tahrir St.", "Abbas El Akkad St.", "Gameat El Dowal St.", "El Haram St.", "Corniche Rd.", "Makram Ebeid St."];
const STATUSES: OrderStatus[] = ["NEW", "NEW", "CONFIRMED", "SHIPPED", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED"];

async function clean() {
  const orders = await db.order.deleteMany({ where: { idempotencyKey: { startsWith: "test-" } } });
  const products = await db.product.deleteMany({ where: { slug: { startsWith: "test-" } } });
  console.log(`removed ${orders.count} orders and ${products.count} products`);
}

/** 100 test products without photos, spread over the existing categories. */
async function addProducts(tag: string) {
  const categories = await db.category.findMany();
  const productRows = Array.from({ length: 100 }, (_, i) => {
    const category = pick(categories);
    const [typeAr, typeEn] = pick(TYPES[category.slug] ?? [["قطعة", "Piece"]]);
    const [styleAr, styleEn] = pick(STYLES);
    const [colorAr, colorEn] = pick(COLORS);
    const nameAr = `${typeAr} ${styleAr} ${colorAr}`;
    const nameEn = `${styleEn} ${typeEn} ${colorEn}`;
    const price = between(15, 250) * 10000; // 1,500 to 25,000 EGP, in piasters
    return {
      nameAr,
      nameEn,
      slug: `test-${tag}-${i + 1}`,
      searchText: buildSearchText({ nameAr, nameEn }),
      descriptionEn: `Test product ${i + 1}.`,
      descriptionAr: `منتج تجريبي ${i + 1}.`,
      price,
      compareAtPrice: Math.random() < 0.2 ? Math.round(price * 1.2) : null,
      stock: Math.random() < 0.15 ? 0 : between(1, 25),
      featured: Math.random() < 0.05,
      categoryId: category.id,
    };
  });
  await db.product.createMany({ data: productRows });
  const products = await db.product.findMany({ where: { slug: { startsWith: `test-${tag}-` } }, include: { images: true } });
  console.log(`added ${products.length} products`);
  return products;
}

async function main() {
  if (process.argv.includes("--clean")) return clean();

  const tag = randomBytes(3).toString("hex");
  const products = process.argv.includes("--orders")
    ? await db.product.findMany({ where: { active: true }, include: { images: { orderBy: { position: "asc" }, take: 1 } } })
    : await addProducts(tag);
  if (!products.length) throw new Error("no products to order");

  const settings = await db.setting.findUnique({ where: { id: 1 } });
  const shippingFee = settings?.shippingFee ?? 15000;

  // One order per customer: customers are grouped by phone, so 100 phones = 100 customers.
  for (let i = 0; i < 100; i++) {
    const lines = Array.from({ length: between(1, 3) }, () => pick(products));
    const items = [...new Map(lines.map((p) => [p.id, p])).values()].map((p) => {
      const quantity = between(1, 2);
      const imageKey = p.images[0]?.key ?? null; // kept on the order, like a real checkout
      return { productId: p.id, nameAr: p.nameAr, nameEn: p.nameEn, imageKey, unitPrice: p.price, quantity, lineTotal: p.price * quantity };
    });
    const subtotal = items.reduce((sum, x) => sum + x.lineTotal, 0);
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    await db.order.create({
      data: {
        publicToken: randomBytes(24).toString("base64url"),
        idempotencyKey: `test-${tag}-${i + 1}`,
        status: pick(STATUSES),
        locale: Math.random() < 0.7 ? "ar" : "en",
        customerName: name,
        phone: `01${pick(["0", "1", "2", "5"])}${String(between(0, 99_999_999)).padStart(8, "0")}`,
        email: Math.random() < 0.4 ? `${name.toLowerCase().replace(" ", ".")}${i}@example.com` : null,
        governorate: pick(GOVERNORATES).code,
        city: pick(["Nasr City", "Maadi", "Dokki", "Smouha", "Heliopolis", "6th of October", "Mansoura"]),
        address: `${between(1, 120)} ${pick(STREETS)}, Apt ${between(1, 30)}`,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee,
        createdAt: new Date(Date.now() - between(0, 90 * 24 * 60) * 60_000), // within the last 90 days
        items: { create: items },
      },
    });
  }
  console.log("added 100 orders from 100 customers");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
