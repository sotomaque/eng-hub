"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { assignTiers, type ContributorStatsData, tierConfig } from "@/lib/tiers";

type StatsBarChartProps = {
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

export function StatsBarChart({ stats, memberMap }: StatsBarChartProps) {
  const tierMap = assignTiers(stats);
  const sorted = [...stats].sort((a, b) => b.commits - a.commits);

  const data = sorted.map((s) => {
    const member = memberMap[s.githubUsername];
    const name = member
      ? member.callsign || `${member.firstName} ${member.lastName}`
      : s.githubUsername;
    const tier = tierMap.get(s) ?? "C";
    return {
      name,
      commits: s.commits,
      fill: tierConfig[tier].color,
      tier,
    };
  });

  if (data.length === 0) {
    return null;
  }

  const chartHeight = Math.max(300, data.length * 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commits by Contributor</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as (typeof data)[number];
                return (
                  <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{d.name}</p>
                    <p>Commits: {d.commits.toLocaleString()}</p>
                    <p>Tier: {d.tier}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="commits" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
