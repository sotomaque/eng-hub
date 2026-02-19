"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  assignTiers,
  type ContributorStatsData,
  tierConfig,
} from "@/lib/tiers";

interface StatsDataTableProps {
  stats: ContributorStatsData[];
  memberMap: Record<
    string,
    {
      personId: string;
      firstName: string;
      lastName: string;
      callsign: string | null;
      imageUrl: string | null;
    }
  >;
}

export function StatsDataTable({ stats, memberMap }: StatsDataTableProps) {
  const tierMap = assignTiers(stats);
  const sorted = [...stats].sort((a, b) => b.commits - a.commits);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contributor Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Contributor</TableHead>
              <TableHead className="w-16">Tier</TableHead>
              <TableHead className="w-28">Trend</TableHead>
              <TableHead className="text-right">Commits</TableHead>
              <TableHead className="text-right">PRs Opened</TableHead>
              <TableHead className="text-right">PRs Merged</TableHead>
              <TableHead className="text-right">Reviews</TableHead>
              <TableHead className="text-right">Lines Changed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s, i) => {
              const member = memberMap[s.githubUsername];
              const name = member
                ? member.callsign || `${member.firstName} ${member.lastName}`
                : s.githubUsername;
              const tier = tierMap.get(s) ?? "C";
              const config = tierConfig[tier];

              return (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground font-medium">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={member?.imageUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{name}</span>
                      {member && (
                        <span className="text-muted-foreground text-xs">
                          {s.githubUsername.includes("@")
                            ? s.githubUsername
                            : `@${s.githubUsername}`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-md text-xs font-bold ${config.bgClass} ${config.textClass}`}
                    >
                      {config.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TrendIndicator
                      trend={s.trend}
                      avg={s.avgWeeklyCommits}
                      recent={s.recentWeeklyCommits}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {s.commits.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.prsOpened.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.prsMerged.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.reviewsDone.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600 dark:text-green-400">
                      +{s.additions.toLocaleString()}
                    </span>
                    {" / "}
                    <span className="text-red-600 dark:text-red-400">
                      -{s.deletions.toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({
  trend,
  avg,
  recent,
}: {
  trend: string;
  avg: number;
  recent: number;
}) {
  const pctChange = avg > 0 ? Math.round(((recent - avg) / avg) * 100) : 0;

  if (trend === "up") {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <TrendingUp className="size-4" />
        <span className="text-xs">+{pctChange}%</span>
      </div>
    );
  }

  if (trend === "down") {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <TrendingDown className="size-4" />
        <span className="text-xs">{pctChange}%</span>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center gap-1">
      <Minus className="size-4" />
      <span className="text-xs">Stable</span>
    </div>
  );
}
