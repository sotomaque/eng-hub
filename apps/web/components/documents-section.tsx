"use client";

import { useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Download,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Presentation,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { getTagColor } from "@/lib/tag-colors";
import { useTRPC } from "@/lib/trpc/client";

type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  tags: string[];
  createdAt: Date | string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    callsign: string | null;
  };
};

type DocumentsSectionProps = {
  basePath: string;
  documents: DocumentItem[];
  canEdit?: boolean;
};

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return Presentation;
  if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
  return FileIcon;
}

export function DocumentsSection({ basePath, documents, canEdit }: DocumentsSectionProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags)))
    .sort()
    .map((tag) => ({ label: tag, value: tag }));

  const filteredDocs =
    selectedTags.length > 0
      ? documents.filter((doc) => selectedTags.some((tag) => doc.tags.includes(tag)))
      : documents;

  const deleteMutation = useMutation(
    trpc.document.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Document deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeletingId(null),
    }),
  );

  function handleAdd() {
    router.push(`${basePath}?addDocument=true`, { scroll: false });
  }

  function handleEdit(id: string) {
    router.push(`${basePath}?editDocument=${id}`, { scroll: false });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Documents</CardTitle>
          {canEdit !== false && (
            <Button onClick={handleAdd} size="sm">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Document</span>
            </Button>
          )}
        </div>
      </CardHeader>
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 px-6 pb-2">
          <DataTableFacetedFilter
            title="Tags"
            options={allTags}
            value={selectedTags}
            onValueChange={setSelectedTags}
          />
        </div>
      )}
      <CardContent>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileIcon className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No documents yet. Upload PDFs, Word docs, spreadsheets, and more.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map((doc) => {
              const Icon = getFileIcon(doc.mimeType);
              const uploaderName =
                doc.uploadedBy.callsign ?? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`;
              const createdAt =
                typeof doc.createdAt === "string" ? new Date(doc.createdAt) : doc.createdAt;

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="text-muted-foreground size-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{doc.title}</span>
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <Badge
                                key={tag}
                                className={cn("border-0 px-1.5 py-0 text-xs", getTagColor(tag))}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {uploaderName} &middot;{" "}
                        {formatDistanceToNow(createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                    >
                      <Download className="size-3" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                    {canEdit !== false && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(doc.id)}>
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete document?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove &quot;{doc.title}&quot;. The file will no longer be
                                accessible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                disabled={deletingId === doc.id}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                {deletingId === doc.id ? "Deleting…" : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
