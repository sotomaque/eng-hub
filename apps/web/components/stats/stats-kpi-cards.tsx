"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  GitCommitHorizontal,
  GitMerge,
  MessageSquare,
  Users,
} from "lucide-react";
import type { ContributorStatsData } from "@/lib/tiers";

interface StatsKPICardsProps {
  stats: ContributorStatsData[];
}

export function StatsKPICards({ stats }: StatsKPICardsProps) {
  const totalCommits = stats.reduce((sum, s) => sum + s.commits, 0);
  const totalPrsMerged = stats.reduce((sum, s) => sum + s.prsMerged, 0);
  const totalReviews = stats.reduce((sum, s) => sum + s.reviewsDone, 0);
  const activeContributors = stats.filter((s) => s.commits > 0).length;

  const cards = [
    {
      title: "Total Commits",
      value: totalCommits.toLocaleString(),
      icon: GitCommitHorizontal,
    },
    {
      title: "PRs Merged",
      value: totalPrsMerged.toLocaleString(),
      icon: GitMerge,
    },
    {
      title: "Reviews Done",
      value: totalReviews.toLocaleString(),
      icon: MessageSquare,
    },
    {
      title: "Active Contributors",
      value: activeContributors.toLocaleString(),
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
