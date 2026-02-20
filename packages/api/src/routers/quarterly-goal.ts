import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { detectGoalCycle } from "../lib/roadmap-hierarchy";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const roadmapStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "AT_RISK",
]);

const personSelect = {
  id: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
} as const;

const goalInclude = {
  assignments: { include: { person: { select: personSelect } } },
  keyResults: { orderBy: { sortOrder: "asc" as const } },
  children: {
    orderBy: [
      { sortOrder: "asc" as const },
      { targetDate: "asc" as const },
    ],
    include: {
      assignments: { include: { person: { select: personSelect } } },
      keyResults: { orderBy: { sortOrder: "asc" as const } },
    },
  },
};

const createQuarterlyGoalSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum.default("NOT_STARTED"),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

const updateQuarterlyGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum,
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

export const quarterlyGoalRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.quarterlyGoal.findMany({
        where: { projectId: input.projectId, parentId: null },
        orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
        include: goalInclude,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.quarterlyGoal.findUnique({
        where: { id: input.id },
        include: {
          ...goalInclude,
          parent: { select: { id: true, title: true } },
        },
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
          parentId: input.parentId ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    }),

  update: protectedProcedure
    .input(updateQuarterlyGoalSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const newParentId = data.parentId ?? null;

      if (newParentId) {
        const current = await db.quarterlyGoal.findUniqueOrThrow({
          where: { id },
          select: { parentId: true },
        });

        if (newParentId !== current.parentId) {
          const hasCycle = await detectGoalCycle(id, newParentId);
          if (hasCycle) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot set this parent — it would create a circular hierarchy.",
            });
          }
        }
      }

      return db.quarterlyGoal.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          quarter: data.quarter,
          targetDate: data.targetDate ?? null,
          status: data.status,
          parentId: newParentId,
          sortOrder: data.sortOrder ?? 0,
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

  setAssignees: protectedProcedure
    .input(
      z.object({
        quarterlyGoalId: z.string(),
        personIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        await tx.quarterlyGoalAssignment.deleteMany({
          where: { quarterlyGoalId: input.quarterlyGoalId },
        });
        if (input.personIds.length > 0) {
          await tx.quarterlyGoalAssignment.createMany({
            data: input.personIds.map((personId) => ({
              quarterlyGoalId: input.quarterlyGoalId,
              personId,
            })),
          });
        }
      });
    }),
});
