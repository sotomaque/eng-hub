"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

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

function ChartTooltipContent({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toFixed(1)}
        </p>
      ))}
    </div>
  );
}

const ALL_LINES = [
  { key: "average", label: "Average", color: "hsl(var(--primary))" },
  { key: "coreCompetencyScore", label: "Core Competency", color: "var(--color-chart-1, #8884d8)" },
  { key: "teamworkScore", label: "Teamwork", color: "var(--color-chart-2, #82ca9d)" },
  { key: "innovationScore", label: "Innovation", color: "var(--color-chart-3, #ffc658)" },
  { key: "timeManagementScore", label: "Time Mgmt", color: "var(--color-chart-4, #ff7300)" },
] as const;

export function PerformanceReviewChart({ data, onSelectReview }: PerformanceReviewChartProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime()),
    [data],
  );

  const toggleHighlight = useCallback((key: string) => {
    setHighlighted((prev) => (prev === key ? null : key));
  }, []);

  return (
    <div className="space-y-3">
      {/* Custom chip legend */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_LINES.map((line) => {
          const isActive = highlighted === line.key;
          const isMuted = highlighted !== null && !isActive;
          return (
            <button
              key={line.key}
              type="button"
              onClick={() => toggleHighlight(line.key)}
              aria-pressed={isActive}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                borderColor: isActive ? line.color : undefined,
                backgroundColor: isActive
                  ? `color-mix(in srgb, ${line.color} 15%, transparent)`
                  : undefined,
                opacity: isMuted ? 0.4 : 1,
              }}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: line.color }} />
              {line.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={sorted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="cycleLabel" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
          <Tooltip content={ChartTooltipContent} />
          {ALL_LINES.map((line) => {
            const isAverage = line.key === "average";
            const isHighlighted = highlighted === line.key;
            const isMuted = highlighted !== null && !isHighlighted;

            const baseWidth = isAverage ? 3 : 2;
            const strokeWidth = isHighlighted ? 4 : baseWidth;
            const strokeOpacity = isMuted ? 0.1 : isAverage ? 1 : 0.7;

            return (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                dot={{
                  r: isHighlighted ? 5 : isAverage ? 4 : 3,
                  strokeWidth: 2,
                  fill: "var(--color-background, #fff)",
                }}
                activeDot={{
                  r: isHighlighted ? 8 : isAverage ? 7 : 6,
                  cursor: "pointer",
                  strokeWidth: 2,
                  onClick: (_e: unknown, dotPayload: { payload?: { id?: string } }) => {
                    const reviewId = dotPayload?.payload?.id;
                    if (reviewId) onSelectReview(reviewId);
                  },
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
