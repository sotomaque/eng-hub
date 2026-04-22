/** Named storage buckets available in this application. */
export type StorageBucket = "images" | "documents";

/** Options passed to useFileUpload(). */
export type UseFileUploadOptions = {
  /**
   * Called after a successful upload. `storedValue` is what the caller should
   * persist to the database — a relative object path for the Supabase adapter,
   * a full URL for the UploadThing adapter. Consumers should render it through
   * `resolveStorageUrl()` from `@workspace/storage/url` (or rely on the Prisma
   * `$extends` transform, which calls it automatically on read).
   */
  onUploadComplete?: (storedValue: string, fileName?: string) => void;
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
  /** Relative object path — persist this to the database, not the full URL. */
  path: string;
};
