import type { PrismaClient } from "@workspace/db";

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Rebuilds the active arrangement's teams and assignments from the current
 * live Team / TeamMembership state. Called after every live-team mutation so
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
  const memberships = await tx.teamMembership.findMany({
    where: { team: { projectId } },
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

    const teamMemberIds = memberships
      .filter((m) => m.teamId === team.id)
      .map((m) => m.teamMemberId);
    if (teamMemberIds.length > 0) {
      await tx.arrangementAssignment.createMany({
        data: teamMemberIds.map((memberId) => ({
          arrangementTeamId: arrTeam.id,
          teamMemberId: memberId,
        })),
      });
    }
  }
}
