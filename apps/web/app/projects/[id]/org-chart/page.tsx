import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrgChart, type OrgMember } from "@/components/org-chart";
import { getCachedProject } from "@/lib/trpc/cached-queries";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function OrgChartContent({ projectId }: { projectId: string }) {
  const trpc = await createServerCaller();
  const [project, members, recentChanges] = await Promise.all([
    getCachedProject(projectId),
    trpc.teamMember.getOrgTree({ projectId }),
    trpc.managerChange.getByProjectId({ projectId, limit: 20 }),
  ]);
  if (!project) notFound();

  const orgMembers: OrgMember[] = members.map((m) => ({
    id: m.id,
    personId: m.person.id,
    firstName: m.person.firstName,
    lastName: m.person.lastName,
    callsign: m.person.callsign,
    imageUrl: m.person.imageUrl,
    managerId: m.person.managerId,
    manager: m.person.manager,
    roleName: m.person.role?.name ?? null,
    titleName: m.person.title?.name ?? null,
  }));

  return (
    <OrgChart
      members={orgMembers}
      recentChanges={recentChanges.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}

export default async function OrgChartPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <OrgChartContent projectId={id} />
    </Suspense>
  );
}
