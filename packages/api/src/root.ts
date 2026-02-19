import { arrangementRouter } from "./routers/arrangement";
import { healthRouter } from "./routers/health";
import { milestoneRouter } from "./routers/milestone";
import { projectRouter } from "./routers/project";
import { projectLinkRouter } from "./routers/project-link";
import { quarterlyGoalRouter } from "./routers/quarterly-goal";
import { roleRouter } from "./routers/role";
import { statusUpdateRouter } from "./routers/status-update";
import { teamRouter } from "./routers/team";
import { teamMemberRouter } from "./routers/team-member";
import { titleRouter } from "./routers/title";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  arrangement: arrangementRouter,
  health: healthRouter,
  milestone: milestoneRouter,
  project: projectRouter,
  projectLink: projectLinkRouter,
  quarterlyGoal: quarterlyGoalRouter,
  role: roleRouter,
  statusUpdate: statusUpdateRouter,
  team: teamRouter,
  teamMember: teamMemberRouter,
  title: titleRouter,
});

export type AppRouter = typeof appRouter;
