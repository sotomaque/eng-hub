import type { HealthStatus, RoadmapStatus } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Flag,
  Link as LinkIcon,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";

import { HEALTH_STATUS_DOT, HEALTH_STATUS_LABEL } from "@/lib/health-status";

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
}: ProjectOverviewProps) {
  const basePath = `/projects/${projectId}`;
  const milestoneStats = countByStatus(milestones);
  const goalStats = countByStatus(quarterlyGoals);

  return (
    <div className="space-y-8">
      {description && (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {description}
        </p>
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
    </div>
  );
}
