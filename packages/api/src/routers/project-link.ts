import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

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
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.projectLink.findMany({
        where: { projectId: input.projectId },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.projectLink.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createProjectLinkSchema)
    .mutation(async ({ input }) => {
      return db.projectLink.create({
        data: {
          projectId: input.projectId,
          label: input.label,
          url: input.url,
        },
      });
    }),

  update: protectedProcedure
    .input(updateProjectLinkSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.projectLink.update({
        where: { id },
        data: {
          label: data.label,
          url: data.url,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.projectLink.delete({
        where: { id: input.id },
      });
    }),
});
