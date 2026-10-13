import { z } from "zod";
import { GOVERNORATE_CODES } from "./governorates";
import { poundsToPiasters } from "./money";
import { EGYPT_MOBILE, normalizeDigits, normalizePhone } from "./normalize";

// Error messages are translation keys under "errors.*".

const text = (min: number, max: number) => z.string().trim().min(min, "required").max(max, "tooLong");
const optionalText = (max: number) =>
  z.string().trim().max(max, "tooLong").transform((v) => v || null);

export const checkoutSchema = z.object({
  name: text(2, 100),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(EGYPT_MOBILE, "invalidPhone")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().safeParse(v).success, "invalidEmail")
    .transform((v) => v || null),
  governorate: z.enum(GOVERNORATE_CODES, "invalidGovernorate"),
  city: text(2, 100),
  address: text(5, 500),
  notes: optionalText(500),
  idempotencyKey: z.uuid(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Flattens Zod issues to { field: errorKey } (first issue per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

// ---------- Admin ----------

const egp = (required: boolean) =>
  z
    .string()
    .transform((v) => normalizeDigits(v).trim())
    .transform((v, ctx) => {
      if (v === "") {
        if (required) ctx.addIssue({ code: "custom", message: "required" });
        return null;
      }
      const n = poundsToPiasters(v);
      if (!Number.isFinite(n) || n < 0 || n > 100_000_000_00) {
        ctx.addIssue({ code: "custom", message: "invalidNumber" });
        return null;
      }
      return n;
    });

export const productSchema = z.object({
  nameAr: text(1, 200),
  nameEn: text(1, 200),
  descriptionAr: optionalText(5000),
  descriptionEn: optionalText(5000),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, "tooLong")
    .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "invalidSlug"),
  price: egp(true),
  compareAtPrice: egp(false),
  stock: z
    .string()
    .transform((v) => Number(normalizeDigits(v).trim() || "0"))
    .pipe(z.number("invalidNumber").int("invalidNumber").min(0, "invalidNumber").max(100_000, "invalidNumber")),
  categoryId: z.string().max(40).transform((v) => v || null),
  active: z.boolean(),
  featured: z.boolean(),
});

export const categorySchema = z.object({
  nameAr: text(1, 100),
  nameEn: text(1, 100),
  slug: z.string().trim().toLowerCase().max(80, "tooLong").refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "invalidSlug"),
});

export const settingsSchema = z.object({
  storeNameAr: text(1, 100),
  storeNameEn: text(1, 100),
  phone: z.string().transform(normalizePhone).pipe(z.string().max(20, "tooLong")),
  shippingFee: egp(true),
});
