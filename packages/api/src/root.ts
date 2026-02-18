import { healthRouter } from "./routers/health";
import { milestoneRouter } from "./routers/milestone";
import { projectRouter } from "./routers/project";
import { projectLinkRouter } from "./routers/project-link";
import { quarterlyGoalRouter } from "./routers/quarterly-goal";
import { statusUpdateRouter } from "./routers/status-update";
import { teamMemberRouter } from "./routers/team-member";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  milestone: milestoneRouter,
  project: projectRouter,
  projectLink: projectLinkRouter,
  quarterlyGoal: quarterlyGoalRouter,
  statusUpdate: statusUpdateRouter,
  teamMember: teamMemberRouter,
});

export type AppRouter = typeof appRouter;
