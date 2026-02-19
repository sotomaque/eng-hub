import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoleSheet } from "@/components/role-sheet";
import { TeamEditSheet } from "@/components/team-edit-sheet";
import { TeamMemberSheet } from "@/components/team-member-sheet";
import { TeamSection } from "@/components/team-section";
import { TeamSheet } from "@/components/team-sheet";
import { TitleSheet } from "@/components/title-sheet";
import { getCachedProject } from "@/lib/trpc/cached-queries";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

function manageReturnPath(
  projectId: string,
  sp: { addMember?: string; editMember?: string },
): string {
  const base = `/projects/${projectId}/team`;
  if (sp.editMember) return `${base}?editMember=${sp.editMember}`;
  if (sp.addMember === "true") return `${base}?addMember=true`;
  return base;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addMember?: string;
    editMember?: string;
    addTeam?: string;
    editTeam?: string;
    manageTeams?: string;
    manageRoles?: string;
    manageTitles?: string;
  }>;
}

async function TeamContent({ id }: { id: string }) {
  const project = await getCachedProject(id);
  if (!project) notFound();

  return (
    <TeamSection
      projectId={id}
      members={project.teamMembers}
      teams={project.teams}
    />
  );
}

async function EditTeamContent({
  projectId,
  teamId,
}: {
  projectId: string;
  teamId: string;
}) {
  const trpc = await createServerCaller();
  const team = await trpc.team.getById({ id: teamId });
  if (!team) return null;
  return <TeamEditSheet projectId={projectId} team={team} />;
}

async function EditTeamMemberContent({
  projectId,
  memberId,
}: {
  projectId: string;
  memberId: string;
}) {
  const trpc = await createServerCaller();
  const member = await trpc.teamMember.getById({ id: memberId });
  if (!member) return null;
  return <TeamMemberSheet projectId={projectId} member={member} />;
}

export default async function TeamPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <TeamContent id={id} />
      </Suspense>

      {sp.addMember === "true" && <TeamMemberSheet projectId={id} />}
      {sp.editMember && (
        <Suspense fallback={null}>
          <EditTeamMemberContent projectId={id} memberId={sp.editMember} />
        </Suspense>
      )}

      {sp.addTeam === "true" && <TeamEditSheet projectId={id} />}
      {sp.editTeam && (
        <Suspense fallback={null}>
          <EditTeamContent projectId={id} teamId={sp.editTeam} />
        </Suspense>
      )}

      {sp.manageTeams === "true" && <TeamSheet projectId={id} />}
      {sp.manageRoles === "true" && (
        <RoleSheet returnPath={manageReturnPath(id, sp)} />
      )}
      {sp.manageTitles === "true" && (
        <TitleSheet returnPath={manageReturnPath(id, sp)} />
      )}
    </>
  );
}
