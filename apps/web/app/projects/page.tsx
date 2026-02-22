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
    sortBy?: string;
    sortOrder?: string;
    parentId?: string;
  }>;
}

async function ProjectsContent({
  page,
  pageSize,
  search,
  sortBy,
  sortOrder,
}: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: "name" | "updatedAt";
  sortOrder?: "asc" | "desc";
}) {
  const trpc = await createServerCaller();
  const { items, totalCount } = await trpc.project.list({
    page,
    pageSize,
    search: search || undefined,
    sortBy,
    sortOrder,
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
        parentId: p.parentId,
        parentName: p.parent?.name ?? null,
      }))}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      search={search}
      sortBy={sortBy}
      sortOrder={sortOrder}
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
  const validSortBy = ["name", "updatedAt"] as const;
  const sortBy = validSortBy.find((v) => v === params.sortBy);
  const sortOrder =
    params.sortOrder === "asc" || params.sortOrder === "desc"
      ? params.sortOrder
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <ProjectsContent
            page={page}
            pageSize={pageSize}
            search={params.search}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </Suspense>
      </main>

      {isCreating && <ProjectSheet defaultParentId={params.parentId} />}

      {editProjectId && (
        <Suspense fallback={null}>
          <EditProjectContent projectId={editProjectId} />
        </Suspense>
      )}
    </div>
  );
}
