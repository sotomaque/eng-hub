"use client";

import type { HealthStatus } from "@prisma/client";
import { Badge } from "@workspace/ui/components/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const HEALTH_CONFIG: Record<
  HealthStatus,
  { label: string; className: string; dotClass: string }
> = {
  GREEN: {
    label: "Healthy",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    dotClass: "bg-green-500",
  },
  YELLOW: {
    label: "At Risk",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    dotClass: "bg-yellow-500",
  },
  RED: {
    label: "Critical",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    dotClass: "bg-red-500",
  },
};

interface ProjectHeaderProps {
  name: string;
  description: string | null;
  latestStatus: { overallStatus: HealthStatus } | null;
}

export function ProjectHeader({
  name,
  description,
  latestStatus,
}: ProjectHeaderProps) {
  const config = latestStatus
    ? HEALTH_CONFIG[latestStatus.overallStatus]
    : null;

  return (
    <div className="space-y-2">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        {config && (
          <Badge className={config.className}>
            <span className={`size-2 rounded-full ${config.dotClass}`} />
            {config.label}
          </Badge>
        )}
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
