import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HealthAssessmentForm } from "@/components/health-assessment-form";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; assessmentId: string }>;
}

async function AssessmentContent({
  projectId,
  assessmentId,
}: {
  projectId: string;
  assessmentId: string;
}) {
  const trpc = await createServerCaller();
  const assessment = await trpc.healthAssessment.getById({ id: assessmentId });
  if (!assessment) notFound();

  return (
    <HealthAssessmentForm
      projectId={projectId}
      assessment={{
        id: assessment.id,
        overallStatus: assessment.overallStatus,
        overallNotes: assessment.overallNotes,
        growthStatus: assessment.growthStatus,
        growthNotes: assessment.growthNotes,
        marginStatus: assessment.marginStatus,
        marginNotes: assessment.marginNotes,
        longevityStatus: assessment.longevityStatus,
        longevityNotes: assessment.longevityNotes,
        clientSatisfactionStatus: assessment.clientSatisfactionStatus,
        clientSatisfactionNotes: assessment.clientSatisfactionNotes,
        engineeringVibeStatus: assessment.engineeringVibeStatus,
        engineeringVibeNotes: assessment.engineeringVibeNotes,
        productVibeStatus: assessment.productVibeStatus,
        productVibeNotes: assessment.productVibeNotes,
        designVibeStatus: assessment.designVibeStatus,
        designVibeNotes: assessment.designVibeNotes,
      }}
    />
  );
}

export default async function HealthAssessmentPage({ params }: PageProps) {
  const { id, assessmentId } = await params;

  return (
    <Suspense fallback={null}>
      <AssessmentContent projectId={id} assessmentId={assessmentId} />
    </Suspense>
  );
}
