import type { HealthStatus, RoadmapStatus } from "@prisma/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  DollarSign,
  Flag,
  FolderOpen,
  Link as LinkIcon,
  Plus,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";

import { HEALTH_STATUS_DOT, HEALTH_STATUS_LABEL } from "@/lib/health-status";

type ChildProject = {
  id: string;
  name: string;
  imageUrl: string | null;
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
  subProjects: ChildProject[];
  fundedBy: { id: string; name: string } | null;
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

function StatPill({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {count} {label}
    </span>
  );
}

function MetricCard({
  href,
  icon: Icon,
  label,
  children,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block">
      <div className="rounded-2xl border border-transparent bg-card p-6 shadow-sm transition-all group-hover:border-border group-hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-primary rounded-xl bg-primary/10 p-2">
            <Icon className="size-4" strokeWidth={1.5} />
          </div>
          <ArrowRight className="text-muted-foreground/0 size-4 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
        </div>
        <div className="mt-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </Link>
  );
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
  subProjects,
  fundedBy,
}: ProjectOverviewProps) {
  const basePath = `/projects/${projectId}`;
  const milestoneStats = countByStatus(milestones);
  const goalStats = countByStatus(quarterlyGoals);

  return (
    <div className="space-y-8">
      {(description || fundedBy) && (
        <div className="space-y-2">
          {fundedBy && (
            <Link
              href={`/projects/${fundedBy.id}`}
              className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:underline"
            >
              <DollarSign className="size-3.5" />
              Funded by {fundedBy.name}
            </Link>
          )}
          {description && (
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Health */}
        <MetricCard href={`${basePath}/health`} icon={Activity} label="Health">
          {latestStatus ? (
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${HEALTH_STATUS_DOT[latestStatus.overallStatus]}`}
              />
              <span className="text-2xl font-bold tracking-tight">
                {HEALTH_STATUS_LABEL[latestStatus.overallStatus]}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">
              No assessments yet
            </span>
          )}
        </MetricCard>

        {/* Team */}
        <MetricCard href={`${basePath}/team`} icon={Users} label="Team">
          <div className="text-2xl font-bold tracking-tight">{memberCount}</div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {memberCount === 1 ? "member" : "members"}
            {teamCount > 0 &&
              ` across ${teamCount} ${teamCount === 1 ? "team" : "teams"}`}
          </p>
        </MetricCard>

        {/* Milestones */}
        <MetricCard href={`${basePath}/roadmap`} icon={Flag} label="Milestones">
          <div className="text-2xl font-bold tracking-tight">
            {milestones.length}
          </div>
          {milestones.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <StatPill
                count={milestoneStats.completed}
                label="done"
                color="text-green-600 dark:text-green-400"
              />
              <StatPill
                count={milestoneStats.inProgress}
                label="active"
                color="text-blue-600 dark:text-blue-400"
              />
              <StatPill
                count={milestoneStats.atRisk}
                label="at risk"
                color="text-red-600 dark:text-red-400"
              />
            </div>
          )}
        </MetricCard>

        {/* Quarterly Goals */}
        <MetricCard
          href={`${basePath}/roadmap`}
          icon={Target}
          label="Quarterly Goals"
        >
          <div className="text-2xl font-bold tracking-tight">
            {quarterlyGoals.length}
          </div>
          {quarterlyGoals.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <StatPill
                count={goalStats.completed}
                label="done"
                color="text-green-600 dark:text-green-400"
              />
              <StatPill
                count={goalStats.inProgress}
                label="active"
                color="text-blue-600 dark:text-blue-400"
              />
              <StatPill
                count={goalStats.atRisk}
                label="at risk"
                color="text-red-600 dark:text-red-400"
              />
            </div>
          )}
        </MetricCard>

        {/* Links */}
        <MetricCard href={`${basePath}/links`} icon={LinkIcon} label="Links">
          <div className="text-2xl font-bold tracking-tight">{linkCount}</div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {linkCount === 1 ? "resource" : "resources"}
          </p>
        </MetricCard>
      </div>

      {/* Sub-Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Sub-Projects</h3>
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects?create=true&parentId=${projectId}`}>
              <Plus className="size-4" />
              Add Sub-Project
            </Link>
          </Button>
        </div>

        {subProjects.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subProjects.map((child) => (
              <Link
                key={child.id}
                href={`/projects/${child.id}`}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-border hover:bg-accent/50"
              >
                <Avatar className="size-8 shrink-0 rounded-md">
                  <AvatarImage src={child.imageUrl ?? undefined} />
                  <AvatarFallback className="rounded-md text-xs">
                    {child.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{child.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
            <FolderOpen className="text-muted-foreground/50 size-8" />
            <p className="text-muted-foreground mt-2 text-sm">
              No sub-projects yet
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href={`/projects?create=true&parentId=${projectId}`}>
                <Plus className="size-4" />
                Add Sub-Project
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
