import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GlossarySection } from "@/components/glossary-section";
import { createServerCaller } from "@/lib/trpc/server";

export const metadata: Metadata = { title: "Glossary" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function GlossaryContent({ id }: { id: string }) {
  const trpc = await createServerCaller();
  const entries = await trpc.glossary.getByProjectId({ projectId: id });
  if (entries === undefined) notFound();

  return <GlossarySection projectId={id} entries={entries} />;
}

export default async function GlossaryPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <GlossaryContent id={id} />
    </Suspense>
  );
}
