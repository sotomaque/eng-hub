import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentSheet } from "@/components/document-sheet";
import { DocumentsSection } from "@/components/documents-section";
import { getCachedProject } from "@/lib/trpc/cached-queries";
import { createServerCaller } from "@/lib/trpc/server";

export const metadata: Metadata = { title: "Documents" };

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addDocument?: string;
    editDocument?: string;
  }>;
};

async function DocumentsContent({ id }: { id: string }) {
  const trpcPromise = createServerCaller();
  const [project, trpc] = await Promise.all([getCachedProject(id), trpcPromise]);
  if (!project) notFound();
  const documents = await trpc.document.getByProjectId({ projectId: id });

  return <DocumentsSection basePath={`/projects/${id}/documents`} documents={documents} />;
}

async function EditDocumentContent({
  projectId,
  documentId,
}: {
  projectId: string;
  documentId: string;
}) {
  const trpc = await createServerCaller();
  const doc = await trpc.document.getById({ id: documentId });
  if (!doc) return null;
  return (
    <DocumentSheet
      projectId={projectId}
      returnPath={`/projects/${projectId}/documents`}
      document={doc}
    />
  );
}

export default async function DocumentsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <DocumentsContent id={id} />
      </Suspense>

      {sp.addDocument === "true" && (
        <DocumentSheet projectId={id} returnPath={`/projects/${id}/documents`} />
      )}
      {sp.editDocument && (
        <Suspense fallback={null}>
          <EditDocumentContent projectId={id} documentId={sp.editDocument} />
        </Suspense>
      )}
    </>
  );
}
