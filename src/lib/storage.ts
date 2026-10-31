import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Images go to Cloudflare R2 when the R2_* variables are set, otherwise to public/uploads
// (handy for local development). Callers only ever see the object key.
// No "server-only" import: the seed and scripts/ reuse this file outside Next.js.
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const r2Vars = [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET];
if (r2Vars.some(Boolean) && !r2Vars.every(Boolean)) {
  throw new Error("Set all of R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET, or none of them.");
}

const r2 = R2_BUCKET
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
      // R2 doesn't support the SDK's newer default checksums on every operation.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  : null;

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

/** Keys are random and never reused, so browsers and the CDN may cache them forever. */
export async function putObject(key: string, data: Buffer) {
  if (r2) {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: data,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return;
  }
  const file = path.join(ROOT, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

/** Best effort: the DB row is already gone, so a failure only leaves an orphaned file. */
export async function deleteObject(key: string) {
  try {
    if (r2) await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    else await unlink(path.join(ROOT, key));
  } catch (err) {
    console.error("[storage] delete failed", { key, err: (err as Error).message });
  }
}

/** e.g. newImageKey(`products/${id}`) or newImageKey("categories") */
export function newImageKey(folder: string) {
  return `${folder}/${randomBytes(12).toString("hex")}.webp`;
}
