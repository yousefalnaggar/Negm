// One-off: copies every file in public/uploads to the R2 bucket under the same key,
// so existing DB rows keep working after switching MEDIA_BASE_URL to the bucket.
// Usage: npx tsx scripts/upload-to-r2.ts
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { putObject, r2 } from "../src/lib/storage";

const ROOT = path.join(process.cwd(), "public", "uploads");

async function main() {
  if (!r2) throw new Error("R2 is not configured: set the R2_* variables in .env");
  const files = (await readdir(ROOT, { recursive: true, withFileTypes: true })).filter((f) => f.isFile());
  for (const f of files) {
    const file = path.join(f.parentPath, f.name);
    const key = path.relative(ROOT, file).split(path.sep).join("/");
    await putObject(key, await readFile(file));
    console.log("uploaded", key);
  }
  console.log(`done: ${files.length} files to ${process.env.R2_BUCKET}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
