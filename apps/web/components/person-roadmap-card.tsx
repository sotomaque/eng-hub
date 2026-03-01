import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Flag, Target } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants/roadmap";
import { groupRoadmapByProject } from "@/lib/roadmap-grouping";

type RoadmapAssignment = {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  projectId: string;
  project: { id: string; name: string };
};

type PersonRoadmapCardProps = {
  milestoneAssignments: { milestone: RoadmapAssignment }[];
  quarterlyGoalAssignments: {
    quarterlyGoal: RoadmapAssignment & { quarter: string | null };
  }[];
};

export function PersonRoadmapCard({
  milestoneAssignments,
  quarterlyGoalAssignments,
}: PersonRoadmapCardProps) {
  const totalCount = milestoneAssignments.length + quarterlyGoalAssignments.length;
  const projects = groupRoadmapByProject(milestoneAssignments, quarterlyGoalAssignments);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Roadmap
          {totalCount > 0 && (
            <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
              {totalCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-muted-foreground text-sm">Not assigned to any roadmap items</p>
        ) : (
          <div className="space-y-4">
            {projects.map((proj) => (
              <div key={proj.projectId} className="space-y-2">
                <Link
                  href={`/projects/${proj.projectId}/roadmap`}
                  className="text-sm font-semibold hover:underline"
                >
                  {proj.projectName}
                </Link>
                <ul className="space-y-1.5 pl-1">
                  {proj.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <Flag className="size-3 shrink-0 text-muted-foreground" />
                      <Link
                        href={`/projects/${proj.projectId}/roadmap?editMilestone=${m.id}`}
                        className="truncate text-sm hover:underline"
                      >
                        {m.title}
                      </Link>
                      <Badge
                        className={`shrink-0 text-[10px] ${STATUS_STYLES[m.status as keyof typeof STATUS_STYLES] ?? ""}`}
                      >
                        {STATUS_LABELS[m.status as keyof typeof STATUS_LABELS] ?? m.status}
                      </Badge>
                    </li>
                  ))}
                  {proj.goals.map((g) => (
                    <li key={g.id} className="flex items-center gap-2">
                      <Target className="size-3 shrink-0 text-muted-foreground" />
                      <Link
                        href={`/projects/${proj.projectId}/roadmap?editGoal=${g.id}`}
                        className="truncate text-sm hover:underline"
                      >
                        {g.title}
                      </Link>
                      <Badge
                        className={`shrink-0 text-[10px] ${STATUS_STYLES[g.status as keyof typeof STATUS_STYLES] ?? ""}`}
                      >
                        {STATUS_LABELS[g.status as keyof typeof STATUS_LABELS] ?? g.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
