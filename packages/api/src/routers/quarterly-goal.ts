import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const roadmapStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "AT_RISK",
]);

const createQuarterlyGoalSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum.default("NOT_STARTED"),
});

const updateQuarterlyGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum,
});

export const quarterlyGoalRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.quarterlyGoal.findMany({
        where: { projectId: input.projectId },
        orderBy: { targetDate: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.quarterlyGoal.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createQuarterlyGoalSchema)
    .mutation(async ({ input }) => {
      return db.quarterlyGoal.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          quarter: input.quarter,
          targetDate: input.targetDate ?? null,
          status: input.status,
        },
      });
    }),

  update: protectedProcedure
    .input(updateQuarterlyGoalSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.quarterlyGoal.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          quarter: data.quarter,
          targetDate: data.targetDate ?? null,
          status: data.status,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.quarterlyGoal.delete({
        where: { id: input.id },
      });
    }),
});
