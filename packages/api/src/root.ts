import { healthRouter } from "./routers/health";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
