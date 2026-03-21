"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DocumentSheet } from "@/components/document-sheet";
import { DocumentsSection } from "@/components/documents-section";
import { useTRPC } from "@/lib/trpc/client";

type PersonDocumentsProps = {
  personId: string;
  canEdit?: boolean;
};

export function PersonDocuments({ personId, canEdit }: PersonDocumentsProps) {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const addDocument = searchParams.get("addDocument") === "true";
  const editDocumentId = searchParams.get("editDocument");

  const { data: documents, isLoading } = useQuery(
    trpc.document.getByPersonId.queryOptions({ personId }),
  );

  if (isLoading) {
    return <Skeleton className="h-40 rounded-lg" />;
  }

  const editDoc = editDocumentId ? documents?.find((d) => d.id === editDocumentId) : undefined;

  return (
    <>
      <DocumentsSection
        basePath={`/people/${personId}`}
        documents={documents ?? []}
        canEdit={canEdit}
      />

      {addDocument && <DocumentSheet personId={personId} returnPath={`/people/${personId}`} />}
      {editDoc && (
        <DocumentSheet personId={personId} returnPath={`/people/${personId}`} document={editDoc} />
      )}
    </>
  );
}
