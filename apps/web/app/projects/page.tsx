import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { ProjectSheet } from "@/components/project-sheet";
import { ProjectsTable } from "@/components/projects-table";
import { ProjectsTableSkeleton } from "@/components/projects-table-skeleton";
import { createServerCaller } from "@/lib/trpc/server";

export const metadata: Metadata = { title: "Projects" };

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    edit?: string;
    create?: string;
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

async function ProjectsContent({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const trpc = await createServerCaller();
  const { items, totalCount } = await trpc.project.list({
    page,
    pageSize,
    search: search || undefined,
  });
  return (
    <ProjectsTable
      projects={items.map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        description: p.description,
        updatedAt:
          typeof p.updatedAt === "string"
            ? p.updatedAt
            : p.updatedAt.toISOString(),
        healthStatus: p.healthAssessments[0]?.overallStatus ?? null,
      }))}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      search={search}
    />
  );
}

async function EditProjectContent({ projectId }: { projectId: string }) {
  const trpc = await createServerCaller();
  const project = await trpc.project.getById({ id: projectId });
  if (!project) return null;
  return <ProjectSheet project={project} />;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editProjectId = params.edit;
  const isCreating = params.create === "true";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <ProjectsContent
            page={page}
            pageSize={pageSize}
            search={params.search}
          />
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
