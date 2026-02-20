import { arrangementRouter } from "./routers/arrangement";
import { githubStatsRouter } from "./routers/github-stats";
import { keyResultRouter } from "./routers/key-result";
import { healthRouter } from "./routers/health";
import { managerChangeRouter } from "./routers/manager-change";
import { meetingRouter } from "./routers/meeting";
import { meetingTemplateRouter } from "./routers/meeting-template";
import { milestoneRouter } from "./routers/milestone";
import { personRouter } from "./routers/person";
import { personCommentRouter } from "./routers/person-comment";
import { projectRouter } from "./routers/project";
import { projectLinkRouter } from "./routers/project-link";
import { quarterlyGoalRouter } from "./routers/quarterly-goal";
import { departmentRouter } from "./routers/department";
import { healthAssessmentRouter } from "./routers/health-assessment";
import { teamRouter } from "./routers/team";
import { teamMemberRouter } from "./routers/team-member";
import { titleRouter } from "./routers/title";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  arrangement: arrangementRouter,
  githubStats: githubStatsRouter,
  health: healthRouter,
  keyResult: keyResultRouter,
  managerChange: managerChangeRouter,
  meeting: meetingRouter,
  meetingTemplate: meetingTemplateRouter,
  milestone: milestoneRouter,
  person: personRouter,
  personComment: personCommentRouter,
  project: projectRouter,
  projectLink: projectLinkRouter,
  quarterlyGoal: quarterlyGoalRouter,
  department: departmentRouter,
  healthAssessment: healthAssessmentRouter,
  team: teamRouter,
  teamMember: teamMemberRouter,
  title: titleRouter,
});

export type AppRouter = typeof appRouter;
