import type { StorageBucket } from "./types";

/**
 * Resolves a stored storage value into a renderable URL.
 *
 * Stored values can be either:
 *   - A relative object path (e.g. `"uuid/alice.png"`) — the new format written by the
 *     Supabase adapter. Expanded to `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/<bucket>/<path>`.
 *   - A full URL (e.g. `"https://utfs.io/..."`) — the legacy format written by the
 *     UploadThing adapter. Returned as-is so we can roll forward without rewriting
 *     every historical row.
 *
 * Keeping URL construction here means swapping the Supabase host in Phase 3 of the
 * self-hosted migration is an env-var change, not a database rewrite.
 */
export function resolveStorageUrl(value: string, bucket: StorageBucket): string;
export function resolveStorageUrl(
  value: string | null | undefined,
  bucket: StorageBucket,
): string | null;
export function resolveStorageUrl(
  value: string | null | undefined,
  bucket: StorageBucket,
): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be set to resolve Supabase storage paths.");
  }

  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${value}`;
}
