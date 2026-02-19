import { notFound } from "next/navigation";
import { ArrangementEditor } from "@/components/arrangement-editor";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; arrangementId: string }>;
}

export default async function ArrangementEditorPage({ params }: PageProps) {
  const { id, arrangementId } = await params;
  const trpc = await createServerCaller();

  const arrangement = await trpc.arrangement.getById({ id: arrangementId });
  if (!arrangement) notFound();

  return <ArrangementEditor projectId={id} arrangement={arrangement} />;
}
