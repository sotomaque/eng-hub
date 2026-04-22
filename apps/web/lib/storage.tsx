"use client";

import type { StorageBucket, UseFileUploadOptions, UseFileUploadResult } from "@workspace/storage";
import { useSupabaseFileUpload } from "@workspace/storage/client";
import { useUploadThing } from "@/lib/uploadthing-components";

// Map abstract bucket names to UploadThing route keys defined in lib/uploadthing.ts
const UPLOADTHING_ROUTES = {
  images: "imageUploader",
  documents: "documentUploader",
} as const satisfies Record<StorageBucket, "imageUploader" | "documentUploader">;

function useUploadThingFileUpload(
  bucket: StorageBucket,
  options: UseFileUploadOptions = {},
): UseFileUploadResult {
  const routeKey = UPLOADTHING_ROUTES[bucket];
  const { startUpload: utStartUpload, isUploading } = useUploadThing(routeKey, {
    onClientUploadComplete: (res) => {
      const url = res[0]?.ufsUrl;
      const fileName = res[0]?.name;
      if (url) options.onUploadComplete?.(url, fileName);
    },
    onUploadError: options.onUploadError,
  });

  async function startUpload(files: File[]) {
    await utStartUpload(files);
  }

  return { startUpload, isUploading };
}

const PROVIDER = process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "supabase";

/**
 * Provider-agnostic file upload hook.
 *
 * Delegates to UploadThing (default) or Supabase Storage based on
 * the NEXT_PUBLIC_STORAGE_PROVIDER env var.
 */
export const useFileUpload: (
  bucket: StorageBucket,
  options?: UseFileUploadOptions,
) => UseFileUploadResult =
  PROVIDER === "supabase" ? useSupabaseFileUpload : useUploadThingFileUpload;
