import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const statusUpdateRouter = createTRPCRouter({
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.statusUpdate.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z.enum(["RED", "YELLOW", "GREEN"]),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.statusUpdate.create({
        data: {
          projectId: input.projectId,
          status: input.status,
          description: input.description,
          authorId: ctx.userId,
        },
      });
    }),
});
