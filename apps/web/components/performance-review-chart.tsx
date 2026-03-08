"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReviewDataPoint = {
  id: string;
  cycleLabel: string;
  reviewDate: string;
  coreCompetencyScore: number;
  teamworkScore: number;
  innovationScore: number;
  timeManagementScore: number;
  average: number;
};

type PerformanceReviewChartProps = {
  data: ReviewDataPoint[];
  onSelectReview: (reviewId: string) => void;
};

const DIMENSION_LINES = [
  { key: "coreCompetencyScore", label: "Core Competency", color: "var(--color-chart-1, #8884d8)" },
  { key: "teamworkScore", label: "Teamwork", color: "var(--color-chart-2, #82ca9d)" },
  { key: "innovationScore", label: "Innovation", color: "var(--color-chart-3, #ffc658)" },
  { key: "timeManagementScore", label: "Time Mgmt", color: "var(--color-chart-4, #ff7300)" },
] as const;

export function PerformanceReviewChart({ data, onSelectReview }: PerformanceReviewChartProps) {
  // Sort ascending by reviewDate for chronological display
  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime()),
    [data],
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={sorted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="cycleLabel" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
                <p className="mb-1 font-medium">{label}</p>
                {payload.map((entry) => (
                  <p key={entry.dataKey as string} style={{ color: entry.color }}>
                    {entry.name}: {Number(entry.value).toFixed(1)}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        {DIMENSION_LINES.map((dim) => (
          <Line
            key={dim.key}
            type="monotone"
            dataKey={dim.key}
            name={dim.label}
            stroke={dim.color}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            dot={{ r: 3 }}
            activeDot={{
              r: 5,
              cursor: "pointer",
              onClick: (_e: unknown, dotPayload: { payload?: { id?: string } }) => {
                const reviewId = dotPayload?.payload?.id;
                if (reviewId) onSelectReview(reviewId);
              },
            }}
          />
        ))}
        <Line
          type="monotone"
          dataKey="average"
          name="Average"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={{ r: 4 }}
          activeDot={{
            r: 6,
            cursor: "pointer",
            onClick: (_e: unknown, dotPayload: { payload?: { id?: string } }) => {
              const reviewId = dotPayload?.payload?.id;
              if (reviewId) onSelectReview(reviewId);
            },
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
