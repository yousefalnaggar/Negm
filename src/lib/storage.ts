import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Dev storage: writes to public/uploads. Swap these two functions for R2 (S3 PutObject /
// DeleteObject) in production; callers only ever see the object key.
const ROOT = path.join(process.cwd(), "public", "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageError extends Error {}

/** Decodes with sharp (real content check), strips metadata, outputs WebP ≤1600px wide. */
export async function processImage(input: Buffer) {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("tooLarge");
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImageError("invalidImage");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new ImageError("invalidImage");

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function putObject(key: string, data: Buffer) {
  const file = path.join(ROOT, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

export async function deleteObject(key: string) {
  try {
    await unlink(path.join(ROOT, key));
  } catch (err) {
    console.error("[storage] delete failed", { key, err: (err as Error).message });
  }
}

export function newProductImageKey(productId: string) {
  return `products/${productId}/${randomBytes(12).toString("hex")}.webp`;
}
