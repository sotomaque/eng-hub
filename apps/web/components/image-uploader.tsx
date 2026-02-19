"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CropDialog } from "@/components/crop-dialog";
import { useUploadThing } from "@/lib/uploadthing-components";

interface ImageUploaderProps {
  label?: string;
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  fallbackText?: string;
  shape?: "circle" | "square";
}

export function ImageUploader({
  label = "Image",
  currentImageUrl,
  onUploadComplete,
  onRemove,
  fallbackText = "",
  shape = "circle",
}: ImageUploaderProps) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSquare = shape === "square";

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      const url = res[0]?.ufsUrl;
      if (url) onUploadComplete(url);
    },
    onUploadError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
    await startUpload([file]);
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-4">
        <Avatar className={isSquare ? "size-16 rounded-md" : "size-16"}>
          <AvatarImage
            src={currentImageUrl ?? undefined}
            alt={label}
            className={isSquare ? "rounded-md" : ""}
          />
          <AvatarFallback className={isSquare ? "rounded-md" : ""}>
            {fallbackText ? (
              <span className="text-base font-medium">{fallbackText}</span>
            ) : (
              <ImageIcon className="text-muted-foreground size-6" />
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
          {currentImageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-8"
              onClick={onRemove}
              disabled={isUploading}
            >
              <X className="size-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {cropSrc && (
        <CropDialog
          imageSrc={cropSrc}
          cropShape={isSquare ? "rect" : "round"}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
