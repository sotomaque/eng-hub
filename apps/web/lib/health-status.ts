import type { HealthStatus } from "@prisma/client";

export const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = {
  GREEN: "Good",
  YELLOW: "Neutral",
  RED: "Bad",
};

export const HEALTH_STATUS_DOT: Record<HealthStatus, string> = {
  GREEN: "bg-green-500",
  YELLOW: "bg-yellow-500",
  RED: "bg-red-500",
};

export const HEALTH_STATUS_BADGE: Record<HealthStatus, string> = {
  GREEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  YELLOW:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  RED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};
