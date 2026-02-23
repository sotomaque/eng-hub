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
    status?: string;
    type?: string;
    favorite?: string;
  }>;
}

async function ProjectsContent({
  page,
  pageSize,
  search,
  status,
  type,
  favorite,
  sortBy,
  sortOrder,
}: {
  page: number;
  pageSize: number;
  search?: string;
  status?: ("GREEN" | "YELLOW" | "RED" | "NONE")[];
  type?: ("toplevel" | "subproject")[];
  favorite?: boolean;
  sortBy?: "name" | "updatedAt";
  sortOrder?: "asc" | "desc";
}) {
  const trpc = await createServerCaller();
  const [{ items, totalCount }, favoriteIds] = await Promise.all([
    trpc.project.list({
      page,
      pageSize,
      search: search || undefined,
      status,
      type,
      favorite,
      sortBy,
      sortOrder,
    }),
    trpc.project.myFavoriteIds(),
  ]);
  const favoriteSet = new Set(favoriteIds);
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
        isFavorited: favoriteSet.has(p.id),
      }))}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      search={search}
      status={status}
      type={type}
      favorite={favorite}
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
  const validStatuses = ["GREEN", "YELLOW", "RED", "NONE"] as const;
  const status = params.status
    ?.split(",")
    .filter((s): s is (typeof validStatuses)[number] =>
      (validStatuses as readonly string[]).includes(s),
    );
  const validTypes = ["toplevel", "subproject"] as const;
  const type = params.type
    ?.split(",")
    .filter((t): t is (typeof validTypes)[number] =>
      (validTypes as readonly string[]).includes(t),
    );
  const favorite = params.favorite === "true" ? true : undefined;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <ProjectsContent
            page={page}
            pageSize={pageSize}
            search={params.search}
            status={status}
            type={type}
            favorite={favorite}
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
