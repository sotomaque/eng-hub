import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ArrangementsList } from "@/components/arrangements-list";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamsPage({ params }: PageProps) {
  const { id } = await params;
  const trpc = await createServerCaller();

  const [project, arrangements, members] = await Promise.all([
    trpc.project.getById({ id }),
    trpc.arrangement.getByProjectId({ projectId: id }),
    trpc.teamMember.getByProjectId({ projectId: id }),
  ]);

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ArrangementsList
          projectId={id}
          projectName={project.name}
          arrangements={arrangements}
          totalMembers={members.length}
          hasLiveTeams={project.teams.length > 0}
        />
      </main>
    </div>
  );
}
