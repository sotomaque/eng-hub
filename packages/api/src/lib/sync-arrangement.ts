import type { PrismaClient } from "@workspace/db";

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Rebuilds the active arrangement's teams and assignments from the current
 * live Team / TeamMember state. Called after every live-team mutation so
 * the active arrangement stays in sync.
 */
export async function syncLiveToActiveArrangement(
  tx: TransactionClient,
  projectId: string,
) {
  const active = await tx.teamArrangement.findFirst({
    where: { projectId, isActive: true },
  });
  if (!active) return;

  // Delete existing arrangement teams (cascades to assignments)
  await tx.arrangementTeam.deleteMany({
    where: { arrangementId: active.id },
  });

  // Recreate from live teams
  const teams = await tx.team.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
  const members = await tx.teamMember.findMany({
    where: { projectId, teamId: { not: null } },
  });

  for (const [i, team] of teams.entries()) {
    const arrTeam = await tx.arrangementTeam.create({
      data: {
        name: team.name,
        arrangementId: active.id,
        sortOrder: i,
        liveTeamId: team.id,
      },
    });

    const teamMembers = members.filter((m) => m.teamId === team.id);
    if (teamMembers.length > 0) {
      await tx.arrangementAssignment.createMany({
        data: teamMembers.map((m) => ({
          arrangementTeamId: arrTeam.id,
          teamMemberId: m.id,
        })),
      });
    }
  }
}
