import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { detectMilestoneCycle } from "../lib/roadmap-hierarchy";
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

const milestoneInclude = {
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

const createMilestoneSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum.default("NOT_STARTED"),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

const updateMilestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum,
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

export const milestoneRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.milestone.findMany({
        where: { projectId: input.projectId, parentId: null },
        orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
        include: milestoneInclude,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.milestone.findUnique({
        where: { id: input.id },
        include: {
          ...milestoneInclude,
          parent: { select: { id: true, title: true } },
        },
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
          parentId: input.parentId ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    }),

  update: protectedProcedure
    .input(updateMilestoneSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const newParentId = data.parentId ?? null;

      if (newParentId) {
        const current = await db.milestone.findUniqueOrThrow({
          where: { id },
          select: { parentId: true },
        });

        if (newParentId !== current.parentId) {
          const hasCycle = await detectMilestoneCycle(id, newParentId);
          if (hasCycle) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot set this parent — it would create a circular hierarchy.",
            });
          }
        }
      }

      return db.milestone.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
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
      return db.milestone.delete({
        where: { id: input.id },
      });
    }),

  setAssignees: protectedProcedure
    .input(
      z.object({
        milestoneId: z.string(),
        personIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        await tx.milestoneAssignment.deleteMany({
          where: { milestoneId: input.milestoneId },
        });
        if (input.personIds.length > 0) {
          await tx.milestoneAssignment.createMany({
            data: input.personIds.map((personId) => ({
              milestoneId: input.milestoneId,
              personId,
            })),
          });
        }
      });
    }),
});
