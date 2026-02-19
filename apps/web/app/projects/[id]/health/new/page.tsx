import { HealthAssessmentForm } from "@/components/health-assessment-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewHealthAssessmentPage({ params }: PageProps) {
  const { id } = await params;

  return <HealthAssessmentForm projectId={id} />;
}
