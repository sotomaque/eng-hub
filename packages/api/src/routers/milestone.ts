import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const roadmapStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "AT_RISK",
]);

const createMilestoneSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum.default("NOT_STARTED"),
});

const updateMilestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum,
});

export const milestoneRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.milestone.findMany({
        where: { projectId: input.projectId },
        orderBy: { targetDate: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.milestone.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createMilestoneSchema)
    .mutation(async ({ input }) => {
      return db.milestone.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          targetDate: input.targetDate ?? null,
          status: input.status,
        },
      });
    }),

  update: protectedProcedure
    .input(updateMilestoneSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.milestone.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          targetDate: data.targetDate ?? null,
          status: data.status,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.milestone.delete({
        where: { id: input.id },
      });
    }),
});
