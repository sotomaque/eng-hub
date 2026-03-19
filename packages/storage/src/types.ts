/** Named storage buckets available in this application. */
export type StorageBucket = "images" | "documents";

/** Options passed to useFileUpload(). */
export type UseFileUploadOptions = {
  onUploadComplete?: (url: string, fileName?: string) => void;
  onUploadError?: (error: Error) => void;
};

/** Value returned by useFileUpload(). */
export type UseFileUploadResult = {
  startUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
};

/** Body sent to POST /api/storage/presign. */
export type PresignRequest = {
  bucket: StorageBucket;
  fileName: string;
  contentType: string;
};

/** Response from POST /api/storage/presign. */
export type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
};
