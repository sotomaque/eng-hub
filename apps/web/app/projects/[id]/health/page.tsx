import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Health" };

import { Suspense } from "react";
import { HealthSection } from "@/components/health-section";
import { getCachedProject } from "@/lib/trpc/cached-queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function HealthContent({ id }: { id: string }) {
  const project = await getCachedProject(id);
  if (!project) notFound();

  return (
    <HealthSection
      projectId={id}
      assessments={project.healthAssessments.map((a) => ({
        id: a.id,
        authorId: a.authorId,
        overallStatus: a.overallStatus,
        growthStatus: a.growthStatus,
        marginStatus: a.marginStatus,
        longevityStatus: a.longevityStatus,
        clientSatisfactionStatus: a.clientSatisfactionStatus,
        engineeringVibeStatus: a.engineeringVibeStatus,
        productVibeStatus: a.productVibeStatus,
        designVibeStatus: a.designVibeStatus,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}

export default async function HealthPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <HealthContent id={id} />
    </Suspense>
  );
}
