"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type SparklineDataPoint = {
  cycleLabel: string;
  reviewDate: string;
  average: number;
};

type PerformanceReviewSparklineProps = {
  data: SparklineDataPoint[];
};

function SparklineTooltipContent({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground text-xs shadow-md">
      <span className="font-medium">{point?.payload?.cycleLabel}</span>:{" "}
      {Number(point?.value).toFixed(1)}
    </div>
  );
}

export function PerformanceReviewSparkline({ data }: PerformanceReviewSparklineProps) {
  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime()),
    [data],
  );

  if (sorted.length < 2) return null;

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sorted} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis domain={[0, 5]} hide />
          <Tooltip content={SparklineTooltipContent} />
          <Line
            type="monotone"
            dataKey="average"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
