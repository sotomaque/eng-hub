import { Suspense } from "react";
import { HealthAssessmentForm } from "@/components/health-assessment-form";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function NewAssessmentContent({ projectId }: { projectId: string }) {
  const trpc = await createServerCaller();
  const latest = await trpc.healthAssessment.getLatest({ projectId });
  return <HealthAssessmentForm projectId={projectId} prefill={latest ?? undefined} />;
}

export default async function NewHealthAssessmentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <NewAssessmentContent projectId={id} />
    </Suspense>
  );
}
