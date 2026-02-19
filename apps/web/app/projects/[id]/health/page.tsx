import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HealthSection } from "@/components/health-section";
import { StatusUpdateSheet } from "@/components/status-update-sheet";
import { getCachedProject } from "@/lib/trpc/cached-queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addStatus?: string }>;
}

async function HealthContent({ id }: { id: string }) {
  const project = await getCachedProject(id);
  if (!project) notFound();

  return (
    <HealthSection
      projectId={id}
      statusUpdates={project.statusUpdates.map((u) => ({
        id: u.id,
        status: u.status,
        description: u.description,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
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
