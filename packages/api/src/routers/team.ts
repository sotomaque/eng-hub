import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const teamRouter = createTRPCRouter({
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.team.findMany({
        where: { projectId: input.projectId },
        orderBy: { name: "asc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.team.create({
        data: {
          projectId: input.projectId,
          name: input.name,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.team.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.team.delete({
        where: { id: input.id },
      });
    }),
});
