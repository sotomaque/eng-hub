import type { Metadata } from "next";
import { Suspense } from "react";
import { AddToProjectDialog } from "@/components/add-to-project-dialog";

export const metadata: Metadata = { title: "People" };

import { AppHeader } from "@/components/app-header";
import { DepartmentSheet } from "@/components/department-sheet";
import { PeopleTable } from "@/components/people-table";
import { PersonSheet } from "@/components/person-sheet";
import { ProjectsTableSkeleton } from "@/components/projects-table-skeleton";
import { TitleSheet } from "@/components/title-sheet";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    create?: string;
    edit?: string;
    addToProject?: string;
    manageTitles?: string;
    manageDepartments?: string;
  }>;
}

async function PeopleContent() {
  const trpc = await createServerCaller();
  const [people, projects] = await Promise.all([
    trpc.person.getAll(),
    trpc.project.getAll(),
  ]);
  return <PeopleTable people={people} projects={projects} />;
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectsTableSkeleton />}>
          <PeopleContent />
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
