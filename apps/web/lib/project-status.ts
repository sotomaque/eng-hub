import type { ProjectStatus } from "@prisma/client";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export const PROJECT_STATUS_DOT: Record<ProjectStatus, string> = {
  ACTIVE: "bg-green-500",
  PAUSED: "bg-yellow-500",
  ARCHIVED: "bg-gray-400",
};
