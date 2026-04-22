import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { syncLiveToActiveArrangement } from "../lib/sync-arrangement";
import { createTRPCRouter, protectedProcedure, requireCapability } from "../trpc";

export const teamRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_READ))
    .query(async ({ input }) => {
      return db.team.findMany({
        where: { projectId: input.projectId },
        include: { _count: { select: { memberships: true } } },
        orderBy: { name: "asc" },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.team.findUnique({ where: { id: input.id } });
  }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional().or(z.literal("")),
        imageUrl: z.string().optional().or(z.literal("")),
      }),
    )
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_WRITE))
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            projectId: input.projectId,
            name: input.name,
            description: input.description || null,
            imageUrl: input.imageUrl || null,
          },
        });
        await syncLiveToActiveArrangement(tx, input.projectId);
        return team;
      });
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional().or(z.literal("")),
        imageUrl: z.string().optional().or(z.literal("")),
      }),
    )
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_WRITE))
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        const team = await tx.team.update({
          where: { id: input.id },
          data: {
            name: input.name,
            description: input.description || null,
            imageUrl: input.imageUrl || null,
          },
        });
        await syncLiveToActiveArrangement(tx, team.projectId);
        return team;
      });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_WRITE))
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        const team = await tx.team.findUniqueOrThrow({
          where: { id: input.id },
        });
        await tx.team.delete({ where: { id: input.id } });
        await syncLiveToActiveArrangement(tx, team.projectId);
        return team;
      });
      return result;
    }),
});
