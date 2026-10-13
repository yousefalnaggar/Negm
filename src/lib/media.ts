import "server-only";
import { env } from "./env";

/** The DB stores keys only; URLs are built here so the media domain can change freely. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${env.MEDIA_BASE_URL.replace(/\/$/, "")}/${key}`;
}
