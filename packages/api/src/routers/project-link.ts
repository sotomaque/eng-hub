import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requireCapability } from "../trpc";

const tagsSchema = z.array(z.string().min(1).max(50)).max(20).default([]);

const createProjectLinkSchema = z.object({
  projectId: z.string(),
  label: z.string().min(1),
  url: z.string().url(),
  tags: tagsSchema,
});

const updateProjectLinkSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string().url(),
  tags: tagsSchema,
});

export const projectLinkRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_LINKS_READ))
    .query(async ({ input }) => {
      return db.projectLink.findMany({
        where: { projectId: input.projectId },
        orderBy: { label: "asc" },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.projectLink.findUnique({
      where: { id: input.id },
    });
  }),

  create: protectedProcedure
    .input(createProjectLinkSchema)
    .use(requireCapability(CAPABILITIES.PROJECT_LINKS_WRITE))
    .mutation(async ({ input }) => {
      const result = await db.projectLink.create({
        data: {
          projectId: input.projectId,
          label: input.label,
          url: input.url,
          tags: input.tags,
        },
      });
      return result;
    }),

  update: protectedProcedure
    .input(updateProjectLinkSchema)
    .use(requireCapability(CAPABILITIES.PROJECT_LINKS_WRITE))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.projectLink.update({
        where: { id },
        data: {
          label: data.label,
          url: data.url,
          tags: data.tags,
        },
      });
      return result;
    }),

  getDistinctTags: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_LINKS_READ))
    .query(async ({ input }) => {
      const links = await db.projectLink.findMany({
        where: { projectId: input.projectId },
        select: { tags: true },
      });
      const tagSet = new Set(links.flatMap((l) => l.tags));
      return Array.from(tagSet).sort();
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_LINKS_WRITE))
    .mutation(async ({ input }) => {
      const result = await db.projectLink.delete({
        where: { id: input.id },
      });
      return result;
    }),
});
