import type { RoadmapStatus } from "@prisma/client";

export const STATUS_STYLES: Record<RoadmapStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  AT_RISK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  AT_RISK: "At Risk",
};
