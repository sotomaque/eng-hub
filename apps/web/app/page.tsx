import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { ProjectSheet } from "@/components/project-sheet";
import { ProjectsTable } from "@/components/projects-table";
import { ProjectsTableSkeleton } from "@/components/projects-table-skeleton";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    edit?: string;
    create?: string;
  }>;
}

async function ProjectsContent() {
  const trpc = await createServerCaller();
  const projects = await trpc.project.getAll();
  return (
    <ProjectsTable
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        description: p.description,
        updatedAt: p.updatedAt.toISOString(),
        healthStatus: p.healthAssessments[0]?.overallStatus ?? null,
      }))}
    />
  );
}

async function EditProjectContent({ projectId }: { projectId: string }) {
  const trpc = await createServerCaller();
  const project = await trpc.project.getById({ id: projectId });
  if (!project) return null;
  return <ProjectSheet project={project} />;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const editProjectId = params.edit;
  const isCreating = params.create === "true";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <ProjectsContent />
        </Suspense>
      </main>

      {isCreating && <ProjectSheet />}

      {editProjectId && (
        <Suspense fallback={null}>
          <EditProjectContent projectId={editProjectId} />
        </Suspense>
      )}
    </div>
  );
}
