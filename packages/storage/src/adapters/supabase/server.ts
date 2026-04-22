import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set when STORAGE_PROVIDER=supabase.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Creates a signed upload URL for a file and returns both the upload URL
 * (for the client to PUT to) and the relative object path (to persist in the
 * database). Callers render the path through `resolveStorageUrl()` — storing
 * just the path keeps DB rows portable across Supabase hosts.
 */
export async function createPresignedUpload(
  bucket: string,
  fileName: string,
): Promise<{ uploadUrl: string; path: string }> {
  const supabase = getSupabaseAdminClient();
  const path = `${crypto.randomUUID()}/${fileName}`;

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    throw error ?? new Error("Failed to create presigned upload URL");
  }

  return { uploadUrl: data.signedUrl, path };
}
