type RoadmapAssignment = {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  projectId: string;
  project: { id: string; name: string };
};

type MilestoneAssignment = {
  milestone: RoadmapAssignment;
};

type GoalAssignment = {
  quarterlyGoal: RoadmapAssignment & { quarter: string | null };
};

export type GroupedProject = {
  projectName: string;
  projectId: string;
  milestones: RoadmapAssignment[];
  goals: (RoadmapAssignment & { quarter: string | null })[];
};

/**
 * Group milestone and goal assignments by project, sorted alphabetically.
 */
export function groupRoadmapByProject(
  milestoneAssignments: MilestoneAssignment[],
  quarterlyGoalAssignments: GoalAssignment[],
): GroupedProject[] {
  const grouped = new Map<string, GroupedProject>();

  for (const a of milestoneAssignments) {
    const key = a.milestone.projectId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectName: a.milestone.project.name,
        projectId: key,
        milestones: [],
        goals: [],
      });
    }
    grouped.get(key)?.milestones.push(a.milestone);
  }

  for (const a of quarterlyGoalAssignments) {
    const key = a.quarterlyGoal.projectId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectName: a.quarterlyGoal.project.name,
        projectId: key,
        milestones: [],
        goals: [],
      });
    }
    grouped.get(key)?.goals.push(a.quarterlyGoal);
  }

  return [...grouped.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
}
