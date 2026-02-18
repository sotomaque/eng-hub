import { createTRPCRouter, publicProcedure } from "../trpc";

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => {
    return { status: "ok" as const, timestamp: new Date().toISOString() };
  }),
});
