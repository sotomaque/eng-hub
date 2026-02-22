import { beforeEach, describe, expect, mock, test } from "bun:test";
import { syncLiveToActiveArrangement } from "../sync-arrangement";

// ── Fake transaction client ─────────────────────────────────

const mockFindFirst = mock(() => Promise.resolve(null as unknown));
const mockDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockCreate = mock(() =>
  Promise.resolve({ id: "arr-team-1" } as unknown),
);
const mockAssignmentCreateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTeamFindMany = mock(() => Promise.resolve([] as unknown[]));
const mockMembershipFindMany = mock(() => Promise.resolve([] as unknown[]));

function makeTx() {
  return {
    teamArrangement: { findFirst: mockFindFirst },
    arrangementTeam: { deleteMany: mockDeleteMany, create: mockCreate },
    arrangementAssignment: { createMany: mockAssignmentCreateMany },
    team: { findMany: mockTeamFindMany },
    teamMembership: { findMany: mockMembershipFindMany },
  } as unknown as Parameters<typeof syncLiveToActiveArrangement>[0];
}

// ── Tests ────────────────────────────────────────────────────

describe("syncLiveToActiveArrangement", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockDeleteMany.mockReset();
    mockCreate.mockReset().mockResolvedValue({ id: "arr-team-1" });
    mockAssignmentCreateMany.mockReset();
    mockTeamFindMany.mockReset().mockResolvedValue([]);
    mockMembershipFindMany.mockReset().mockResolvedValue([]);
  });

  test("no-ops when no active arrangement exists", async () => {
    mockFindFirst.mockResolvedValue(null);

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockTeamFindMany).not.toHaveBeenCalled();
  });

  test("deletes existing arrangement teams before recreating", async () => {
    mockFindFirst.mockResolvedValue({ id: "arr-1" });

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { arrangementId: "arr-1" },
    });
  });

  test("creates arrangement teams from live teams", async () => {
    mockFindFirst.mockResolvedValue({ id: "arr-1" });
    mockTeamFindMany.mockResolvedValue([
      { id: "team-a", name: "Alpha" },
      { id: "team-b", name: "Beta" },
    ]);
    // Return different ids for each team create
    mockCreate
      .mockResolvedValueOnce({ id: "arr-team-a" })
      .mockResolvedValueOnce({ id: "arr-team-b" });

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Alpha",
        arrangementId: "arr-1",
        sortOrder: 0,
        liveTeamId: "team-a",
      },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Beta",
        arrangementId: "arr-1",
        sortOrder: 1,
        liveTeamId: "team-b",
      },
    });
  });

  test("creates assignments for team members", async () => {
    mockFindFirst.mockResolvedValue({ id: "arr-1" });
    mockTeamFindMany.mockResolvedValue([{ id: "team-a", name: "Alpha" }]);
    mockMembershipFindMany.mockResolvedValue([
      { teamId: "team-a", teamMemberId: "member-1" },
      { teamId: "team-a", teamMemberId: "member-2" },
    ]);
    mockCreate.mockResolvedValueOnce({ id: "arr-team-a" });

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    expect(mockAssignmentCreateMany).toHaveBeenCalledWith({
      data: [
        { arrangementTeamId: "arr-team-a", teamMemberId: "member-1" },
        { arrangementTeamId: "arr-team-a", teamMemberId: "member-2" },
      ],
    });
  });

  test("handles team with no members (no createMany call)", async () => {
    mockFindFirst.mockResolvedValue({ id: "arr-1" });
    mockTeamFindMany.mockResolvedValue([{ id: "team-a", name: "Alpha" }]);
    // No memberships for team-a
    mockMembershipFindMany.mockResolvedValue([]);
    mockCreate.mockResolvedValueOnce({ id: "arr-team-a" });

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockAssignmentCreateMany).not.toHaveBeenCalled();
  });

  test("handles empty project (no teams, no memberships)", async () => {
    mockFindFirst.mockResolvedValue({ id: "arr-1" });
    mockTeamFindMany.mockResolvedValue([]);
    mockMembershipFindMany.mockResolvedValue([]);

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    expect(mockDeleteMany).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockAssignmentCreateMany).not.toHaveBeenCalled();
  });

  test("maps multiple members to correct teams via membersByTeam lookup", async () => {
    mockFindFirst.mockResolvedValue({ id: "arr-1" });
    mockTeamFindMany.mockResolvedValue([
      { id: "team-a", name: "Alpha" },
      { id: "team-b", name: "Beta" },
    ]);
    mockMembershipFindMany.mockResolvedValue([
      { teamId: "team-a", teamMemberId: "m1" },
      { teamId: "team-b", teamMemberId: "m2" },
      { teamId: "team-b", teamMemberId: "m3" },
    ]);
    mockCreate
      .mockResolvedValueOnce({ id: "arr-a" })
      .mockResolvedValueOnce({ id: "arr-b" });

    await syncLiveToActiveArrangement(makeTx(), "proj-1");

    // Team A: 1 member
    expect(mockAssignmentCreateMany).toHaveBeenCalledWith({
      data: [{ arrangementTeamId: "arr-a", teamMemberId: "m1" }],
    });
    // Team B: 2 members
    expect(mockAssignmentCreateMany).toHaveBeenCalledWith({
      data: [
        { arrangementTeamId: "arr-b", teamMemberId: "m2" },
        { arrangementTeamId: "arr-b", teamMemberId: "m3" },
      ],
    });
  });
});
