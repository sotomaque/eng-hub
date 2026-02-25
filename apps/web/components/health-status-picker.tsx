"use client";

import type { HealthStatus } from "@prisma/client";
import { cn } from "@workspace/ui/lib/utils";
import { HEALTH_STATUS_DOT, HEALTH_STATUS_LABEL } from "@/lib/health-status";

const STATUS_OPTIONS: {
  value: HealthStatus;
  activeClass: string;
}[] = [
  {
    value: "RED",
    activeClass:
      "bg-red-100 text-red-800 ring-red-300 dark:bg-red-900 dark:text-red-300 dark:ring-red-700",
  },
  {
    value: "YELLOW",
    activeClass:
      "bg-yellow-100 text-yellow-800 ring-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:ring-yellow-700",
  },
  {
    value: "GREEN",
    activeClass:
      "bg-green-100 text-green-800 ring-green-300 dark:bg-green-900 dark:text-green-300 dark:ring-green-700",
  },
];

interface HealthStatusPickerProps {
  value: HealthStatus | null | undefined;
  onChange: (status: HealthStatus) => void;
  disabled?: boolean;
}

export function HealthStatusPicker({ value, onChange, disabled }: HealthStatusPickerProps) {
  return (
    <div className="flex gap-2">
      {STATUS_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
              isActive
                ? option.activeClass
                : "bg-muted/50 text-muted-foreground ring-border hover:bg-muted",
            )}
          >
            <span className={cn("size-2 rounded-full", HEALTH_STATUS_DOT[option.value])} />
            {HEALTH_STATUS_LABEL[option.value]}
          </button>
        );
      })}
    </div>
  );
}
