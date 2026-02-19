import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrangementEditor } from "@/components/arrangement-editor";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; arrangementId: string }>;
}

async function ArrangementEditorContent({
  projectId,
  arrangementId,
}: {
  projectId: string;
  arrangementId: string;
}) {
  const trpc = await createServerCaller();
  const arrangement = await trpc.arrangement.getById({ id: arrangementId });
  if (!arrangement) notFound();

  return <ArrangementEditor projectId={projectId} arrangement={arrangement} />;
}

export default async function ArrangementEditorPage({ params }: PageProps) {
  const { id, arrangementId } = await params;

  return (
    <Suspense fallback={null}>
      <ArrangementEditorContent projectId={id} arrangementId={arrangementId} />
    </Suspense>
  );
}
