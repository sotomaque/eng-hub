import type { HealthStatus, RoadmapStatus } from "@prisma/client";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Activity,
  Flag,
  Layers,
  Link as LinkIcon,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";

const HEALTH_DOT: Record<HealthStatus, string> = {
  GREEN: "bg-green-500",
  YELLOW: "bg-yellow-500",
  RED: "bg-red-500",
};

const HEALTH_LABEL: Record<HealthStatus, string> = {
  GREEN: "Good",
  YELLOW: "Neutral",
  RED: "Bad",
};

interface ProjectOverviewProps {
  projectId: string;
  description: string | null;
  latestStatus: { overallStatus: HealthStatus } | null;
  memberCount: number;
  teamCount: number;
  milestones: { status: RoadmapStatus }[];
  quarterlyGoals: { status: RoadmapStatus }[];
  linkCount: number;
}

function countByStatus(items: { status: RoadmapStatus }[]) {
  const counts = { completed: 0, inProgress: 0, atRisk: 0, notStarted: 0 };
  for (const item of items) {
    if (item.status === "COMPLETED") counts.completed++;
    else if (item.status === "IN_PROGRESS") counts.inProgress++;
    else if (item.status === "AT_RISK") counts.atRisk++;
    else counts.notStarted++;
  }
  return counts;
}

export function ProjectOverview({
  projectId,
  description,
  latestStatus,
  memberCount,
  teamCount,
  milestones,
  quarterlyGoals,
  linkCount,
}: ProjectOverviewProps) {
  const basePath = `/projects/${projectId}`;
  const milestoneStats = countByStatus(milestones);
  const goalStats = countByStatus(quarterlyGoals);

  return (
    <div className="space-y-6">
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Health */}
        <Link href={`${basePath}/health`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Health</CardTitle>
              <Activity className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              {latestStatus ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${HEALTH_DOT[latestStatus.overallStatus]}`}
                  />
                  <span className="text-2xl font-bold">
                    {HEALTH_LABEL[latestStatus.overallStatus]}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">
                  No updates yet
                </span>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Team */}
        <Link href={`${basePath}/team`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team</CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberCount}</div>
              <p className="text-muted-foreground text-xs">
                {memberCount === 1 ? "member" : "members"}
                {teamCount > 0 &&
                  ` across ${teamCount} ${teamCount === 1 ? "team" : "teams"}`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Milestones */}
        <Link href={`${basePath}/roadmap`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Milestones</CardTitle>
              <Flag className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{milestones.length}</div>
              {milestones.length > 0 && (
                <div className="flex gap-2 text-xs">
                  {milestoneStats.completed > 0 && (
                    <Badge variant="outline" className="text-green-600">
                      {milestoneStats.completed} done
                    </Badge>
                  )}
                  {milestoneStats.inProgress > 0 && (
                    <Badge variant="outline" className="text-blue-600">
                      {milestoneStats.inProgress} active
                    </Badge>
                  )}
                  {milestoneStats.atRisk > 0 && (
                    <Badge variant="outline" className="text-red-600">
                      {milestoneStats.atRisk} at risk
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Quarterly Goals */}
        <Link href={`${basePath}/roadmap`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Quarterly Goals
              </CardTitle>
              <Target className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quarterlyGoals.length}</div>
              {quarterlyGoals.length > 0 && (
                <div className="flex gap-2 text-xs">
                  {goalStats.completed > 0 && (
                    <Badge variant="outline" className="text-green-600">
                      {goalStats.completed} done
                    </Badge>
                  )}
                  {goalStats.inProgress > 0 && (
                    <Badge variant="outline" className="text-blue-600">
                      {goalStats.inProgress} active
                    </Badge>
                  )}
                  {goalStats.atRisk > 0 && (
                    <Badge variant="outline" className="text-red-600">
                      {goalStats.atRisk} at risk
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Links */}
        <Link href={`${basePath}/links`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Links</CardTitle>
              <LinkIcon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{linkCount}</div>
              <p className="text-muted-foreground text-xs">
                {linkCount === 1 ? "link" : "links"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Arrangements */}
        <Link href={`${basePath}/arrangements`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Arrangements
              </CardTitle>
              <Layers className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamCount}</div>
              <p className="text-muted-foreground text-xs">
                {teamCount === 1 ? "team" : "teams"} configured
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
