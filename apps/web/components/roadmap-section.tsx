"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Flag, Plus, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MilestoneItem } from "@/components/milestones-table";
import { MilestonesTable } from "@/components/milestones-table";
import type { QuarterlyGoalItem } from "@/components/quarterly-goals-table";
import { QuarterlyGoalsTable } from "@/components/quarterly-goals-table";

interface RoadmapSectionProps {
  projectId: string;
  milestones: MilestoneItem[];
  quarterlyGoals: QuarterlyGoalItem[];
  msStatus?: string[];
  msType?: string[];
  msAssignee?: string[];
  qgStatus?: string[];
  qgQuarter?: string[];
  qgType?: string[];
  qgAssignee?: string[];
}

function countWithChildren<T extends { children: { length: number } }>(
  items: T[],
): number {
  let count = items.length;
  for (const item of items) {
    count += item.children.length;
  }
  return count;
}

export function RoadmapSection({
  projectId,
  milestones,
  quarterlyGoals,
  msStatus,
  msType,
  msAssignee,
  qgStatus,
  qgQuarter,
  qgType,
  qgAssignee,
}: RoadmapSectionProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Milestones */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Milestones</h3>
              <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
                {countWithChildren(milestones)}
              </span>
            </div>
            <Button
              onClick={() =>
                router.push(
                  `/projects/${projectId}/roadmap?addMilestone=true`,
                  {
                    scroll: false,
                  },
                )
              }
              size="sm"
              variant="outline"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Flag className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">
                No milestones yet.
              </p>
            </div>
          ) : (
            <MilestonesTable
              projectId={projectId}
              milestones={milestones}
              filterStatus={msStatus}
              filterType={msType}
              filterAssignee={msAssignee}
            />
          )}
        </div>

        <Separator />

        {/* Quarterly Goals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Quarterly Goals</h3>
              <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
                {countWithChildren(quarterlyGoals)}
              </span>
            </div>
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}/roadmap?addGoal=true`, {
                  scroll: false,
                })
              }
              size="sm"
              variant="outline"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {quarterlyGoals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Target className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">
                No quarterly goals yet.
              </p>
            </div>
          ) : (
            <QuarterlyGoalsTable
              projectId={projectId}
              goals={quarterlyGoals}
              filterStatus={qgStatus}
              filterQuarter={qgQuarter}
              filterType={qgType}
              filterAssignee={qgAssignee}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
