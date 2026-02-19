import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ArrangementEditor projectId={id} arrangement={arrangement} />
      </main>
    </div>
  );
}
