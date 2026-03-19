"use client";

import { useState } from "react";
import type {
  PresignResponse,
  StorageBucket,
  UseFileUploadOptions,
  UseFileUploadResult,
} from "../../types";

export function useSupabaseFileUpload(
  bucket: StorageBucket,
  options: UseFileUploadOptions = {},
): UseFileUploadResult {
  const [isUploading, setIsUploading] = useState(false);

  async function startUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, fileName: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { uploadUrl, publicUrl }: PresignResponse = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Direct upload to storage failed");

      options.onUploadComplete?.(publicUrl, file.name);
    } catch (err) {
      options.onUploadError?.(err instanceof Error ? err : new Error("Upload failed"));
    } finally {
      setIsUploading(false);
    }
  }

  return { startUpload, isUploading };
}
