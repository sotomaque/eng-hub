import { describe, expect, test } from "bun:test";
import { groupRoadmapByProject } from "@/lib/roadmap-grouping";

function makeMilestone(id: string, projectId: string, projectName: string, title: string) {
  return {
    milestone: {
      id,
      title,
      status: "IN_PROGRESS",
      targetDate: null,
      projectId,
      project: { id: projectId, name: projectName },
    },
  };
}

function makeGoal(
  id: string,
  projectId: string,
  projectName: string,
  title: string,
  quarter: string | null = null,
) {
  return {
    quarterlyGoal: {
      id,
      title,
      status: "NOT_STARTED",
      targetDate: null,
      projectId,
      project: { id: projectId, name: projectName },
      quarter,
    },
  };
}

describe("groupRoadmapByProject", () => {
  test("returns empty array when no assignments", () => {
    expect(groupRoadmapByProject([], [])).toEqual([]);
  });

  test("groups milestones by project", () => {
    const milestones = [
      makeMilestone("ms-1", "proj-a", "Alpha", "MVP Launch"),
      makeMilestone("ms-2", "proj-a", "Alpha", "Beta Release"),
    ];
    const result = groupRoadmapByProject(milestones, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.projectName).toBe("Alpha");
    expect(result[0]?.milestones).toHaveLength(2);
    expect(result[0]?.goals).toHaveLength(0);
  });

  test("groups goals by project", () => {
    const goals = [
      makeGoal("qg-1", "proj-a", "Alpha", "Improve Performance", "Q1 2026"),
      makeGoal("qg-2", "proj-a", "Alpha", "Test Coverage", "Q2 2026"),
    ];
    const result = groupRoadmapByProject([], goals);
    expect(result).toHaveLength(1);
    expect(result[0]?.goals).toHaveLength(2);
    expect(result[0]?.milestones).toHaveLength(0);
  });

  test("merges milestones and goals for the same project", () => {
    const milestones = [makeMilestone("ms-1", "proj-a", "Alpha", "MVP Launch")];
    const goals = [makeGoal("qg-1", "proj-a", "Alpha", "Performance")];
    const result = groupRoadmapByProject(milestones, goals);
    expect(result).toHaveLength(1);
    expect(result[0]?.milestones).toHaveLength(1);
    expect(result[0]?.goals).toHaveLength(1);
  });

  test("separates items across different projects", () => {
    const milestones = [
      makeMilestone("ms-1", "proj-a", "Alpha", "MVP"),
      makeMilestone("ms-2", "proj-b", "Beta", "Launch"),
    ];
    const result = groupRoadmapByProject(milestones, []);
    expect(result).toHaveLength(2);
  });

  test("sorts projects alphabetically by name", () => {
    const milestones = [
      makeMilestone("ms-1", "proj-z", "Zeta", "Task Z"),
      makeMilestone("ms-2", "proj-a", "Alpha", "Task A"),
      makeMilestone("ms-3", "proj-m", "Mu", "Task M"),
    ];
    const result = groupRoadmapByProject(milestones, []);
    expect(result.map((p) => p.projectName)).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  test("preserves projectId in the output", () => {
    const milestones = [makeMilestone("ms-1", "proj-alpha", "Alpha", "MVP")];
    const result = groupRoadmapByProject(milestones, []);
    expect(result[0]?.projectId).toBe("proj-alpha");
  });

  test("goal creates project group when no milestones exist for that project", () => {
    const milestones = [makeMilestone("ms-1", "proj-a", "Alpha", "MVP")];
    const goals = [makeGoal("qg-1", "proj-b", "Beta", "Coverage")];
    const result = groupRoadmapByProject(milestones, goals);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.projectName)).toEqual(["Alpha", "Beta"]);
  });
});
