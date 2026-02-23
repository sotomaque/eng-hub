import type { Metadata } from "next";
import { Suspense } from "react";

import { AddToProjectDialog } from "@/components/add-to-project-dialog";
import { AppHeader } from "@/components/app-header";
import { DepartmentSheet } from "@/components/department-sheet";
import { PeopleTable } from "@/components/people-table";
import { PersonSheet } from "@/components/person-sheet";
import { ProjectsTableSkeleton } from "@/components/projects-table-skeleton";
import { TitleSheet } from "@/components/title-sheet";
import { createServerCaller } from "@/lib/trpc/server";

export const metadata: Metadata = { title: "People" };

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    create?: string;
    edit?: string;
    addToProject?: string;
    manageTitles?: string;
    manageDepartments?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    multiProject?: string;
    department?: string;
    project?: string;
  }>;
}

async function PeopleContent({
  page,
  pageSize,
  search,
  sortBy,
  sortOrder,
  multiProject,
  departments,
  projects,
}: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: "name" | "email" | "department";
  sortOrder?: "asc" | "desc";
  multiProject?: boolean;
  departments?: string[];
  projects?: string[];
}) {
  const trpc = await createServerCaller();
  const [listResult, projectsResult, departmentsResult] =
    await Promise.allSettled([
      trpc.person.list({
        page,
        pageSize,
        search: search || undefined,
        departments,
        projects,
        sortBy,
        sortOrder,
        multiProject,
      }),
      trpc.project.getAll(),
      trpc.department.getAll(),
    ]);
  if (listResult.status === "rejected") throw listResult.reason;
  const { items, totalCount } = listResult.value;
  const allProjects =
    projectsResult.status === "fulfilled" ? projectsResult.value : [];
  const projectNames = [...new Set(allProjects.map((p) => p.name))].sort();
  const allDepartments =
    departmentsResult.status === "fulfilled" ? departmentsResult.value : [];
  const departmentNames = allDepartments.map((d) => d.name).sort();
  return (
    <PeopleTable
      people={items}
      projectNames={projectNames}
      departmentNames={departmentNames}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      search={search}
      sortBy={sortBy}
      sortOrder={sortOrder}
      multiProject={multiProject}
      departments={departments}
      projects={projects}
    />
  );
}

async function EditPersonContent({ personId }: { personId: string }) {
  const trpc = await createServerCaller();
  const person = await trpc.person.getById({ id: personId });
  if (!person) return null;
  return <PersonSheet person={person} />;
}

async function AddToProjectContent({ personId }: { personId: string }) {
  const trpc = await createServerCaller();
  const person = await trpc.person.getById({ id: personId });
  if (!person) return null;
  return (
    <AddToProjectDialog
      personId={person.id}
      personName={`${person.firstName}${person.callsign ? ` ${person.callsign}` : ""} ${person.lastName}`}
      existingProjectIds={person.projectMemberships.map((m) => m.projectId)}
    />
  );
}

function manageReturnPath(params: { create?: string; edit?: string }): string {
  if (params.edit) return `/people?edit=${params.edit}`;
  if (params.create === "true") return "/people?create=true";
  return "/people";
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isCreating = params.create === "true";
  const editPersonId = params.edit;
  const addToProjectPersonId = params.addToProject;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
  const validSortBy = ["name", "email", "department"] as const;
  const sortBy = validSortBy.find((v) => v === params.sortBy);
  const sortOrder =
    params.sortOrder === "asc" || params.sortOrder === "desc"
      ? params.sortOrder
      : undefined;
  const multiProject = params.multiProject === "true" ? true : undefined;
  const departments = params.department?.split(",").filter(Boolean);
  const projects = params.project?.split(",").filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <PeopleContent
            page={page}
            pageSize={pageSize}
            search={params.search}
            sortBy={sortBy}
            sortOrder={sortOrder}
            multiProject={multiProject}
            departments={departments}
            projects={projects}
          />
        </Suspense>
      </main>

      {isCreating && <PersonSheet />}

      {editPersonId && (
        <Suspense fallback={null}>
          <EditPersonContent personId={editPersonId} />
        </Suspense>
      )}

      {addToProjectPersonId && (
        <Suspense fallback={null}>
          <AddToProjectContent personId={addToProjectPersonId} />
        </Suspense>
      )}

      {params.manageTitles === "true" && (
        <TitleSheet returnPath={manageReturnPath(params)} />
      )}
      {params.manageDepartments === "true" && (
        <DepartmentSheet returnPath={manageReturnPath(params)} />
      )}
    </div>
  );
}
