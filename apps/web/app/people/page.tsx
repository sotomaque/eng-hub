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
  }>;
}

async function PeopleContent({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const trpc = await createServerCaller();
  const [{ items, totalCount }, projects] = await Promise.all([
    trpc.person.list({ page, pageSize, search: search || undefined }),
    trpc.project.getAll(),
  ]);
  const projectNames = [...new Set(projects.map((p) => p.name))].sort();
  return (
    <PeopleTable
      people={items}
      projectNames={projectNames}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      search={search}
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <PeopleContent
            page={page}
            pageSize={pageSize}
            search={params.search}
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
