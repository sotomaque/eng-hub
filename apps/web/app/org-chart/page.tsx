import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { OrgChart, type OrgMember } from "@/components/org-chart";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

async function OrgChartContent() {
  const trpc = await createServerCaller();
  const [people, recentChanges] = await Promise.all([
    trpc.person.getAll(),
    trpc.managerChange.getRecent({ limit: 20 }),
  ]);

  const orgMembers: OrgMember[] = people.map((p) => ({
    id: p.id,
    personId: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    callsign: p.callsign,
    imageUrl: p.imageUrl,
    managerId: p.managerId,
    manager: p.manager,
    roleName: p.role?.name ?? null,
    titleName: p.title?.name ?? null,
  }));

  return (
    <OrgChart
      members={orgMembers}
      recentChanges={recentChanges.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))}
      emptyMessage="No people yet. Add people from the People page to see the org chart."
    />
  );
}

export default function OrgChartPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <OrgChartContent />
        </Suspense>
      </main>
    </div>
  );
}
