"use client";

import type { Milestone, QuarterlyGoal } from "@prisma/client";
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
import { MilestonesTable } from "@/components/milestones-table";
import { QuarterlyGoalsTable } from "@/components/quarterly-goals-table";

interface RoadmapSectionProps {
  projectId: string;
  milestones: Milestone[];
  quarterlyGoals: QuarterlyGoal[];
}

export function RoadmapSection({
  projectId,
  milestones,
  quarterlyGoals,
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
                {milestones.length}
              </span>
            </div>
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}?addMilestone=true`, {
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

          {milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Flag className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">
                No milestones yet.
              </p>
            </div>
          ) : (
            <MilestonesTable projectId={projectId} milestones={milestones} />
          )}
        </div>

        <Separator />

        {/* Quarterly Goals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Quarterly Goals</h3>
              <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
                {quarterlyGoals.length}
              </span>
            </div>
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}?addGoal=true`, {
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
            <QuarterlyGoalsTable projectId={projectId} goals={quarterlyGoals} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
