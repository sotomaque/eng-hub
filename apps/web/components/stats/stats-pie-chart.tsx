"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { assignTiers, type ContributorStatsData, type Tier, tierConfig } from "@/lib/tiers";

type ViewMode = "tier" | "contributor";

type StatsPieChartProps = {
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
};

// Distinct colors for individual contributors
const CONTRIBUTOR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#e11d48",
  "#0ea5e9",
  "#d946ef",
  "#22c55e",
  "#facc15",
];

export function StatsPieChart({ stats, memberMap }: StatsPieChartProps) {
  const [view, setView] = useState<ViewMode>("tier");

  const tierMap = assignTiers(stats);
  const totalCommits = stats.reduce((sum, s) => sum + s.commits, 0);

  // Tier view data
  const tierTotals: Record<Tier, number> = { S: 0, A: 0, B: 0, C: 0 };
  for (const s of stats) {
    const tier = tierMap.get(s) ?? "C";
    tierTotals[tier] += s.commits;
  }

  const tierData = (["S", "A", "B", "C"] as Tier[])
    .filter((tier) => tierTotals[tier] > 0)
    .map((tier) => ({
      name: `Tier ${tier}`,
      value: tierTotals[tier],
      color: tierConfig[tier].color,
    }));

  // Contributor view data
  const contributorData = [...stats]
    .sort((a, b) => b.commits - a.commits)
    .filter((s) => s.commits > 0)
    .map((s, i) => {
      const member = memberMap[s.githubUsername];
      const name = member
        ? member.callsign || `${member.firstName} ${member.lastName}`
        : s.githubUsername;
      return {
        name,
        value: s.commits,
        color: CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length],
      };
    });

  const data = view === "tier" ? tierData : contributorData;

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Commit Share</CardTitle>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setView("tier")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "tier"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              By Tier
            </button>
            <button
              type="button"
              onClick={() => setView("contributor")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "contributor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              By Person
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              label={
                view === "tier"
                  ? ({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  : ({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as (typeof data)[number];
                const pct = totalCommits > 0 ? ((d.value / totalCommits) * 100).toFixed(1) : "0";
                return (
                  <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{d.name}</p>
                    <p>
                      {d.value.toLocaleString()} commits ({pct}%)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
