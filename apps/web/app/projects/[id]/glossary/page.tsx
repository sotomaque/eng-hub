import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GlossaryEntrySheet } from "@/components/glossary-entry-sheet";
import { GlossarySection } from "@/components/glossary-section";
import { createServerCaller } from "@/lib/trpc/server";

export const metadata: Metadata = { title: "Glossary" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addEntry?: string; editEntry?: string }>;
};

async function GlossaryContent({
  id,
  addEntry,
  editEntryId,
}: {
  id: string;
  addEntry: boolean;
  editEntryId?: string;
}) {
  const trpc = await createServerCaller();
  const entries = await trpc.glossary.getByProjectId({ projectId: id });
  if (entries === undefined) notFound();

  const editingEntry = editEntryId ? entries.find((e) => e.id === editEntryId) : undefined;

  return (
    <>
      <GlossarySection projectId={id} entries={entries} />
      {addEntry && <GlossaryEntrySheet projectId={id} />}
      {editingEntry && <GlossaryEntrySheet projectId={id} entry={editingEntry} />}
    </>
  );
}

export default async function GlossaryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <Suspense fallback={null}>
      <GlossaryContent id={id} addEntry={sp.addEntry === "true"} editEntryId={sp.editEntry} />
    </Suspense>
  );
}
