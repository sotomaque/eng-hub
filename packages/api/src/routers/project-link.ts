import { db } from "@workspace/db";
import { z } from "zod";
import { invalidateProjectCache } from "../lib/cache";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const createProjectLinkSchema = z.object({
  projectId: z.string(),
  label: z.string().min(1),
  url: z.string().url(),
});

const updateProjectLinkSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string().url(),
});

export const projectLinkRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.projectLink.findMany({
        where: { projectId: input.projectId },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.projectLink.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createProjectLinkSchema)
    .mutation(async ({ input }) => {
      const result = await db.projectLink.create({
        data: {
          projectId: input.projectId,
          label: input.label,
          url: input.url,
        },
      });
      await invalidateProjectCache(input.projectId);
      return result;
    }),

  update: protectedProcedure
    .input(updateProjectLinkSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.projectLink.update({
        where: { id },
        data: {
          label: data.label,
          url: data.url,
        },
      });
      await invalidateProjectCache(result.projectId);
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db.projectLink.delete({
        where: { id: input.id },
      });
      await invalidateProjectCache(result.projectId);
      return result;
    }),
});
