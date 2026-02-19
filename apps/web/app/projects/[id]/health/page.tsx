import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HealthSection } from "@/components/health-section";
import { StatusUpdateSheet } from "@/components/status-update-sheet";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addStatus?: string }>;
}

async function HealthContent({ id }: { id: string }) {
  const trpc = await createServerCaller();
  const project = await trpc.project.getById({ id });
  if (!project) notFound();

  return <HealthSection projectId={id} statusUpdates={project.statusUpdates} />;
}

export default async function HealthPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <HealthContent id={id} />
      </Suspense>
      {sp.addStatus === "true" && <StatusUpdateSheet projectId={id} />}
    </>
  );
}
