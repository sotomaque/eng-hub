"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Eye, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContributorStatsData } from "@/lib/tiers";

type StatsInsightsProps = {
  stats: ContributorStatsData[];
  memberMap: Record<
    string,
    {
      personId: string;
      firstName: string;
      lastName: string;
      callsign: string | null;
      imageUrl: string | null;
      leftAt: string | null;
    }
  >;
};

const THRESHOLD_OPTIONS = [10, 20, 30, 50];

function pctChange(avg: number, recent: number): number {
  if (avg === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - avg) / avg) * 100);
}

export function StatsInsights({ stats, memberMap }: StatsInsightsProps) {
  const [threshold, setThreshold] = useState(20);

  const { trendingUp, needsAttention, teamAvg, teamRecent, reviewers } = useMemo(() => {
    const up: ContributorStatsData[] = [];
    const down: ContributorStatsData[] = [];
    const revs: ContributorStatsData[] = [];
    let avgSum = 0;
    let recentSum = 0;

    for (const s of stats) {
      const pct = pctChange(s.avgWeeklyCommits, s.recentWeeklyCommits);
      if (pct >= threshold) up.push(s);
      if (pct <= -threshold || (s.commits > 0 && s.recentWeeklyCommits === 0)) down.push(s);
      if (s.reviewsDone > 0) revs.push(s);
      avgSum += s.avgWeeklyCommits;
      recentSum += s.recentWeeklyCommits;
    }

    up.sort((a, b) => b.recentWeeklyCommits - a.recentWeeklyCommits);
    down.sort((a, b) => a.recentWeeklyCommits - b.recentWeeklyCommits);
    revs.sort((a, b) => b.recentWeeklyReviews - a.recentWeeklyReviews);

    return {
      trendingUp: up,
      needsAttention: down,
      teamAvg: avgSum,
      teamRecent: recentSum,
      reviewers: revs,
    };
  }, [stats, threshold]);

  const teamTrendPct = pctChange(teamAvg, teamRecent);
  const teamTrend = teamTrendPct >= 20 ? "up" : teamTrendPct <= -20 ? "down" : "stable";

  if (stats.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Threshold selector */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Threshold:</span>
        <div className="flex gap-1">
          {THRESHOLD_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setThreshold(opt)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                threshold === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt}%
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* Team Velocity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Velocity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Avg weekly commits</span>
              <span className="font-medium">{teamAvg.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Recent (8 wk avg)</span>
              <span className="font-medium">{teamRecent.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Team trend</span>
              <TrendBadge trend={teamTrend} pct={teamTrendPct} />
            </div>
          </CardContent>
        </Card>

        {/* Trending Up */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-green-600 dark:text-green-400" />
              <CardTitle className="text-base">Trending Up ({trendingUp.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {trendingUp.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No contributors &ge;{threshold}% above average.
              </p>
            ) : (
              <div className="space-y-3">
                {trendingUp.map((s) => (
                  <ContributorRow
                    key={s.id}
                    stat={s}
                    memberMap={memberMap}
                    variant="up"
                    metric="commits"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
              <CardTitle className="text-base">Needs Attention ({needsAttention.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No contributors &ge;{threshold}% below average.
              </p>
            ) : (
              <div className="space-y-3">
                {needsAttention.map((s) => (
                  <ContributorRow
                    key={s.id}
                    stat={s}
                    memberMap={memberMap}
                    variant="down"
                    metric="commits"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Review Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {reviewers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No review data available.</p>
            ) : (
              <div className="space-y-3">
                {reviewers.map((s) => (
                  <ContributorRow
                    key={s.id}
                    stat={s}
                    memberMap={memberMap}
                    variant={
                      pctChange(s.avgWeeklyReviews, s.recentWeeklyReviews) >= 0 ? "up" : "down"
                    }
                    metric="reviews"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendBadge({ trend, pct }: { trend: string; pct: number }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
        <TrendingUp className="size-3" />+{pct}%
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
        <TrendingDown className="size-3" />
        {pct}%
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
      <Minus className="size-3" />
      Stable
    </span>
  );
}

function ContributorRow({
  stat,
  memberMap,
  variant,
  metric,
}: {
  stat: ContributorStatsData;
  memberMap: StatsInsightsProps["memberMap"];
  variant: "up" | "down";
  metric: "commits" | "reviews";
}) {
  const member = memberMap[stat.githubUsername];
  const name = member
    ? member.callsign || `${member.firstName} ${member.lastName}`
    : stat.githubUsername;

  const avg = metric === "commits" ? stat.avgWeeklyCommits : stat.avgWeeklyReviews;
  const recent = metric === "commits" ? stat.recentWeeklyCommits : stat.recentWeeklyReviews;
  const change = pctChange(avg, recent);

  // Bar widths for visual comparison
  const maxVal = Math.max(avg, recent, 0.01);
  const avgBarPct = (avg / maxVal) * 100;
  const recentBarPct = (recent / maxVal) * 100;

  const label = metric === "commits" ? "commits/wk" : "reviews/wk";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage src={member?.imageUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">{name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{name}</span>
        </div>
        <span
          className={`text-xs font-medium ${
            variant === "up"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {change > 0 ? "+" : ""}
          {change}%
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground w-8 shrink-0">Avg</span>
        <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-slate-400 dark:bg-slate-600"
            style={{ width: `${avgBarPct}%` }}
          />
        </div>
        <span className="text-muted-foreground w-12 text-right">
          {avg.toFixed(1)} <span className="text-[8px]">{label}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground w-8 shrink-0">Now</span>
        <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${
              variant === "up" ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"
            }`}
            style={{ width: `${recentBarPct}%` }}
          />
        </div>
        <span className="text-muted-foreground w-12 text-right">
          {recent.toFixed(1)} <span className="text-[8px]">{label}</span>
        </span>
      </div>
    </div>
  );
}
