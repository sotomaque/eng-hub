"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TagInput } from "@/components/tag-input";
import { useFileUpload } from "@/lib/storage";
import { useTRPC } from "@/lib/trpc/client";
import { type CreateDocumentInput, createDocumentSchema } from "@/lib/validations/document";

type DocumentSheetProps = {
  projectId?: string;
  personId?: string;
  returnPath: string;
  document?: {
    id: string;
    title: string;
    description: string | null;
    fileName: string;
    tags: string[];
  };
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentSheet({ projectId, personId, returnPath, document }: DocumentSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!document;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);

  const { data: existingTags = [] } = useQuery(
    trpc.document.getDistinctTags.queryOptions({ projectId, personId }),
  );

  const { startUpload, isUploading } = useFileUpload("documents", {
    onUploadComplete: (url, fileName) => {
      const file = fileInputRef.current?.files?.[0];
      setUploadedFile({
        url,
        name: fileName ?? file?.name ?? "Uploaded file",
        size: file?.size,
        mimeType: file?.type,
      });
      if (!form.getValues("title")) {
        const nameWithoutExt = (fileName ?? file?.name ?? "").replace(/\.[^.]+$/, "");
        form.setValue("title", nameWithoutExt, { shouldDirty: true });
      }
    },
    onUploadError: (error) => toast.error(error.message),
  });

  const form = useForm<CreateDocumentInput>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: document?.title ?? "",
      description: document?.description ?? "",
      fileUrl: isEditing ? "https://placeholder.existing" : "",
      fileName: document?.fileName ?? "",
      tags: document?.tags ?? [],
      projectId,
      personId,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = form;

  const createMutation = useMutation(
    trpc.document.create.mutationOptions({
      onSuccess: () => {
        toast.success("Document added");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.document.update.mutationOptions({
      onSuccess: () => {
        toast.success("Document updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    router.push(returnPath, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateDocumentInput) {
    if (isEditing && document) {
      updateMutation.mutate({
        id: document.id,
        title: data.title,
        description: data.description,
        tags: data.tags,
      });
    } else if (uploadedFile) {
      createMutation.mutate({
        ...data,
        fileUrl: uploadedFile.url,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimeType,
      });
    }
  }

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      startUpload([file]);
    }
  }

  const canSubmit = isEditing ? isDirty : !!uploadedFile;

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Document" : "Add Document"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the document details."
              : "Upload a document for this project (PDF, Word, Excel, etc.)."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {/* File upload (create mode only) */}
            {!isEditing && (
              <div className="space-y-2">
                <Label>File</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileChange}
                />
                {uploadedFile ? (
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <FileText className="text-muted-foreground size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{uploadedFile.name}</p>
                      {uploadedFile.size && (
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(uploadedFile.size)}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setUploadedFile(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleFileSelect}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {isUploading ? "Uploading…" : "Choose File"}
                  </Button>
                )}
              </div>
            )}

            {/* Show existing file name in edit mode */}
            {isEditing && document && (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <FileText className="text-muted-foreground size-5 shrink-0" />
                <p className="truncate text-sm font-medium">{document.fileName}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Project Specification"
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this document..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    suggestions={existingTags}
                    placeholder="Add tags..."
                  />
                )}
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !canSubmit || isUploading}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Document"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
