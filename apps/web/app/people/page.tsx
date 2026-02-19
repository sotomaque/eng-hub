import { Suspense } from "react";
import { AddToProjectDialog } from "@/components/add-to-project-dialog";
import { AppHeader } from "@/components/app-header";
import { PeopleTable } from "@/components/people-table";
import { PersonSheet } from "@/components/person-sheet";
import { ProjectsTableSkeleton } from "@/components/projects-table-skeleton";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    create?: string;
    edit?: string;
    addToProject?: string;
  }>;
}

async function PeopleContent() {
  const trpc = await createServerCaller();
  const [people, projects, roles, titles] = await Promise.all([
    trpc.person.getAll(),
    trpc.project.getAll(),
    trpc.role.getAll(),
    trpc.title.getAll(),
  ]);
  return (
    <PeopleTable
      people={people}
      projects={projects}
      roles={roles}
      titles={titles}
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
      personName={`${person.firstName} ${person.lastName}`}
      existingProjectIds={person.projectMemberships.map((m) => m.projectId)}
    />
  );
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
    </div>
  );
}
